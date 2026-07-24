"""Deliberately small product payload for the explanation provider."""

from django.db.models import Min
from rest_framework import serializers

from marketplace.models import Store


def _without_nulls(value):
    if isinstance(value, dict):
        return {key: child for key, child in ((k, _without_nulls(v)) for k, v in value.items()) if child not in (None, {}, [])}
    if isinstance(value, list):
        return [child for child in (_without_nulls(item) for item in value) if child not in (None, {}, [])]
    return value


class AIProductExplanationSerializer(serializers.Serializer):
    """Serialize only grounded, customer-relevant variant facts."""

    def to_representation(self, variant):
        model = variant.device_model
        rear_camera = next((camera for camera in model.camera_systems.all() if camera.position == "rear"), None)
        front_camera = next((camera for camera in model.camera_systems.all() if camera.position == "front"), None)
        lowest_price = variant.offers.filter(
            quantity__gt=0, store__status=Store.Status.ACTIVE
        ).aggregate(value=Min("price"))["value"]
        data = {
            "brand": model.brand.name,
            "model": model.model_name,
            "release_date": model.released_on.isoformat() if model.released_on else None,
            "price": {"lowest_available_price": lowest_price},
            "performance": {
                "chipset": getattr(model.performance_spec, "chipset_name", None),
                "cpu": getattr(model.performance_spec, "cpu_description", None),
                "gpu": getattr(model.performance_spec, "gpu_name", None),
            } if hasattr(model, "performance_spec") else {},
            "display": [{
                "technology": display.technology,
                "size_inches": display.size_inches,
                "resolution_width": display.resolution_width_px,
                "resolution_height": display.resolution_height_px,
                "refresh_rate_hz": display.refresh_rate_hz,
                "brightness_peak_nits": display.peak_brightness_nits,
                "hdr": display.supports_hdr,
            } for display in model.display_specs.all()],
            "battery": {
                "capacity_mah": getattr(model.battery_spec, "capacity_mah", None),
                "charging_w": getattr(model.battery_spec, "wired_charging_w", None),
                "wireless_charging": getattr(model.battery_spec, "supports_wireless_charging", None),
            } if hasattr(model, "battery_spec") else {},
            "camera": {
                "rear": self._camera_data(rear_camera),
                "front": self._camera_data(front_camera),
            },
            "storage": {
                "ram_gb": variant.ram_gb,
                "storage_gb": variant.storage_gb,
                "storage_technology": variant.storage_technology,
            },
        }
        return _without_nulls(data)

    @staticmethod
    def _camera_data(camera):
        if camera is None:
            return None
        return {
            "video_max_resolution": camera.max_video_resolution,
            "video_max_fps": camera.max_video_fps,
            "lenses": [
                {"role": lens.role, "megapixels": lens.megapixels, "ois": lens.has_ois}
                for lens in camera.lenses.all()
            ],
        }
