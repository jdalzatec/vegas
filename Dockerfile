FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /src

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    python3 \
    python3-pip \
    python3-venv \
    git \
    ca-certificates \
    pipx \
 && rm -rf /var/lib/apt/lists/*

COPY conanfile.txt /src/conanfile.txt
RUN pipx run --spec "conan>=2,<3" conan profile detect --force \
 && mkdir -p /src/build \
 && pipx run --spec "conan>=2,<3" conan install /src --output-folder=/src/build --build=missing

COPY . /src
RUN cmake -S /src -B /src/build -G "Unix Makefiles" -DCMAKE_TOOLCHAIN_FILE=/src/build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release \
 && cmake --build /src/build -j

 RUN cp /src/build/vegas /bin/vegas && chmod +x /bin/vegas
