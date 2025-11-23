# vegas
Software package for simulation, graphics and analysis tools for atomistic simulations of magnetic materials.

## Compile

1. Install [conan](https://conan.io/).
2. Run
```bash
conan profile detect --force
conan install . --output-folder=build --build=missing
cmake -S . -B build -G "Unix Makefiles" -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```