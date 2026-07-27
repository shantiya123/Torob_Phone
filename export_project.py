from pathlib import Path

# Root of the project
ROOT = Path("")

# Output file
OUTPUT = ROOT / "project.md"

# Directories to ignore
IGNORE_DIRS = {
    ".git",
    ".idea",
    ".vscode",
    "build",
    "out",
    "target",
    "__pycache__"
}

# File extensions to include
INCLUDE_EXTENSIONS = {
    ".java"
}


def should_skip(path: Path):
    return any(part in IGNORE_DIRS for part in path.parts)


java_files = []

for file in ROOT.rglob("*"):
    if file.is_file():
        if should_skip(file):
            continue

        if file.suffix in INCLUDE_EXTENSIONS:
            java_files.append(file)

java_files.sort()

with OUTPUT.open("w", encoding="utf-8") as out:

    out.write("# Java Project\n\n")

    out.write("## Project Structure\n\n")

    for file in java_files:
        out.write(f"- {file.as_posix()}\n")

    out.write("\n---\n\n")

    for file in java_files:

        out.write(f"# File: {file.as_posix()}\n\n")

        out.write("```java\n")

        try:
            out.write(file.read_text(encoding="utf-8"))
        except UnicodeDecodeError:
            out.write(file.read_text(errors="ignore"))

        out.write("\n```\n\n")

        out.write("---\n\n")

print(f"Done! Generated {OUTPUT}")