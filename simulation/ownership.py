from collections import Counter

from django.apps import apps
from django.db import transaction

from .models import SimulationArtifact, SimulationRun


def marker(run_id):
    return f"sim-{run_id}"


def record(run, instance, *, identity_marker=None, metadata=None):
    model = instance._meta
    return SimulationArtifact.objects.get_or_create(
        run=run,
        app_label=model.app_label,
        model_name=model.model_name,
        object_pk=str(instance.pk),
        defaults={
            "identity_marker": identity_marker,
            "metadata": metadata or {},
        },
    )[0]


def record_many(run, instances, *, identity=None):
    artifacts = []
    for instance in instances:
        value = identity(instance) if identity else None
        artifacts.append(record(run, instance, identity_marker=value))
    return artifacts


@transaction.atomic
def mark_status(run, status, **updates):
    run.status = status
    for field, value in updates.items():
        setattr(run, field, value)
    run.save()
    return run


def model_for_artifact(artifact):
    return apps.get_model(artifact.app_label, artifact.model_name)


def delete_owned_artifacts(run):
    """Delete owned rows in a dependency-safe order and return counts."""
    preferred = {
        "wallettransaction": 10,
        "checkoutattempt": 20,
        "orderitem": 30,
        "order": 40,
        "basketitem": 50,
        "basket": 60,
        "offer": 70,
        "storelegalprofile": 80,
        "store": 90,
        "accountprofile": 100,
        "user": 110,
        "simulationartifact": 900,
    }
    counts = Counter()
    artifacts = list(run.artifacts.order_by("-created_at", "-pk"))
    artifacts.sort(key=lambda item: preferred.get(item.model_name, 500))
    for artifact in artifacts:
        try:
            model = model_for_artifact(artifact)
            object_pk = model._meta.pk.to_python(artifact.object_pk)
            obj = model.objects.filter(pk=object_pk).first()
        except (LookupError, ValueError):
            obj = None
        if obj is not None:
            if artifact.identity_marker:
                identity_values = " ".join(
                    str(getattr(obj, field, "")) for field in ("username", "email", "name", "slug")
                )
                if artifact.identity_marker not in identity_values:
                    raise RuntimeError(
                        f"Ownership marker mismatch for {artifact.app_label}.{artifact.model_name}:{artifact.object_pk}"
                    )
            obj.delete()
            counts[f"{artifact.app_label}.{artifact.model_name}"] += 1
        artifact.delete()
    return dict(counts)
