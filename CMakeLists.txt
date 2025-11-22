cmake_minimum_required(VERSION 4.2.0)
project(vegas LANGUAGES CXX C)
# set(Jsoncpp_DIR "/usr/lib/cmake/jsoncpp/")
find_package(jsoncpp CONFIG REQUIRED)
find_package(hdf5 REQUIRED COMPONENTS CXX)
add_executable(vegas ./code/main.cc)
target_sources(
    vegas PRIVATE
    ./code/src/atom.cc
    ./code/src/lattice.cc
    ./code/src/reporter.cc
    ./code/src/system.cc
)
target_link_libraries(vegas PRIVATE jsoncpp hdf5)
