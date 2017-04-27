cmake_minimum_required(VERSION 3.5.1)
project(vegas CXX C)

# agrego el modulo para poder encontrar jsoncpp
set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/cmake/Modules/")


# agrego los directorios con los .h y agrego a SOURCES todos los archivos cc
include_directories(code/include)
file(GLOB SOURCES "code/src/*.cc")

# creo el ejecutable
add_executable(vegas code/main.cc ${SOURCES})


# agrego banderas de compilacion
set(CMAKE_CXX_FLAGS "-O2 -Wall -ffast-math")
target_link_libraries (vegas ${CMAKE_CXX_FLAGS})

# reviso si HDF5 existe y linkeo
find_package (HDF5 REQUIRED)
if (HDF5_FOUND)
  include_directories(${HDF5_INCLUDE_DIRS})
  target_link_libraries (vegas ${HDF5_LIBRARIES})
  message(STATUS ${HDF5_C_INCLUDE_DIR})
  file(WRITE ${CMAKE_SOURCE_DIR}/code/include/config.h "#include " \"${HDF5_C_INCLUDE_DIR}/hdf5.h\")
endif (HDF5_FOUND)

# reviso si existe jsoncpp y linkeo
find_package(jsoncpp REQUIRED)
find_package(jsoncpp_FOUND)
if (jsoncpp_FOUND)
  include_directories(${JSONCPP_INCLUDE_DIR})
  target_link_libraries (vegas ${JSONCPP_LIBRARIES})
  message(STATUS ${JSONCPP_INCLUDE_PREFIX})
  file(APPEND ${CMAKE_SOURCE_DIR}/code/include/config.h "\n#include " \"${JSONCPP_INCLUDE_PREFIX}/json.h\")
endif (jsoncpp_FOUND)

# establezco que se debe compilar con c++11
set_property(TARGET vegas PROPERTY CXX_STANDARD 11)


# para instalar a /usr/local
install(TARGETS vegas DESTINATION /usr/bin/)