cmake_minimum_required(VERSION 3.20)
project(vegas LANGUAGES CXX C)
find_package(jsoncpp CONFIG QUIET)
find_package(JsonCpp CONFIG QUIET)
find_package(hdf5 CONFIG REQUIRED COMPONENTS CXX)
set(JSONCPP_TARGET "")
if (TARGET jsoncpp::jsoncpp)
    set(JSONCPP_TARGET jsoncpp::jsoncpp)
elseif (TARGET JsonCpp::JsonCpp)
    set(JSONCPP_TARGET JsonCpp::JsonCpp)
else()
    message(FATAL_ERROR "JsonCpp target not found. Make sure to configure with the Conan toolchain or install JsonCpp cmake config.")
endif()
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
target_link_libraries(vegas PRIVATE ${JSONCPP_TARGET} hdf5::hdf5_cpp)
