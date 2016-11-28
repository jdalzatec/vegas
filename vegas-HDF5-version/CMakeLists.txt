cmake_minimum_required(VERSION 2.8.9)
project(vegas CXX)

# agrego el modulo para poder encontrar jsoncpp
set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/cmake/Modules/")


# agrego los directorios con los .h y agrego a SOURCES todos los archivos cc
include_directories(include)
file(GLOB SOURCES "src/*.cc")

# creo el ejecutable
add_executable(vegas main.cc ${SOURCES})


# agrego banderas de compilacion
set(CMAKE_CXX_FLAGS "-O2 -Wall -ffast-math")
target_link_libraries (vegas ${CMAKE_CXX_FLAGS})

# reviso si HDF5 existe y linkeo
find_package (HDF5 REQUIRED)
if (HDF5_FOUND)
  include_directories(${HDF5_INCLUDE_DIRS})
  target_link_libraries (vegas ${HDF5_LIBRARIES})
endif (HDF5_FOUND)

# reviso si existe jsoncpp y linkeo
find_package(jsoncpp REQUIRED)
find_package(jsoncpp_FOUND)
if (jsoncpp_FOUND)
  include_directories(${JSONCPP_INCLUDE_DIR})
  target_link_libraries (vegas ${JSONCPP_LIBRARIES})
endif (jsoncpp_FOUND)

# establezco que se debe compilar con c++11
set_property(TARGET vegas PROPERTY CXX_STANDARD 11)


# para instalar a /usr/local
install(TARGETS vegas DESTINATION ${CMAKE_INSTALL_PREFIX})