cmake_minimum_required(VERSION 4.2.0)
project(vegas LANGUAGES CXX C)
find_package(jsoncpp CONFIG REQUIRED)
find_package(hdf5 REQUIRED COMPONENTS CXX)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")
add_executable(vegas ./src/main.cc)
target_sources(
    vegas PRIVATE
    ./src/atom.cc
    ./src/lattice.cc
    ./src/reporter.cc
    ./src/system.cc
    ./src/starter.cc
)
target_link_libraries(vegas PRIVATE jsoncpp hdf5)
