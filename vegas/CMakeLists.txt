CMAKE_MINIMUM_REQUIRED(VERSION 3.0)
PROJECT(vegas CXX)

# agrego el modulo para poder encontrar jsoncpp
SET(CMAKE_MODULE_PATH "${PROJECT_SOURCE_DIR}/CMake")

# agrego los directorios con los .h y agrego a SOURCES todos los archivos cc
INCLUDE_DIRECTORIES(include)
FILE(GLOB SOURCES "src/*.cc")

# Usamos el estandar c++11 (se pueden poner con PROPERTIES de un solo target)
ADD_COMPILE_OPTIONS(-std=c++11)

# Si compila en modo Release o Debug
SET(CMAKE_CXX_FLAGS_DEBUG "-O0 -Wall -g -DDEBUG")
SET(CMAKE_CXX_FLAGS_RELEASE "-O2 -Wall -ffast-math")

# reviso si existe jsoncpp y HDF5
FIND_PACKAGE(jsoncpp REQUIRED)
FIND_PACKAGE(HDF5 REQUIRED)

#Agrego los nuevos includes y librerias
INCLUDE_DIRECTORIES(
  ${JSONCPP_INCLUDE_DIRS}
  ${HDF5_INCLUDE_DIRS}
  )

SET(LIBRARIES
  ${JSONCPP_LIBRARIES}
  ${HDF5_LIBRARIES}
  )

# creo el ejecutable
ADD_EXECUTABLE(vegas main.cc ${SOURCES})
TARGET_LINK_LIBRARIES(vegas ${LIBRARIES})

# para instalar a /usr/local
INSTALL(TARGETS vegas DESTINATION ${CMAKE_INSTALL_PREFIX})
