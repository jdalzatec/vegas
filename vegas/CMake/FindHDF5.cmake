# Find HDF5
#
# Find the HDF5 includes and library
# 
# if you nee to add a custom library search path, do it via via CMAKE_PREFIX_PATH 
# 
# This module defines
#  HDF5_INCLUDE_DIRS, where to find header, etc.
#  HDF5_LIBRARIES, the libraries needed to use HDF5.
#  HDF5_FOUND, If false, do not try to use HDF5.

# Esto es lo primero para buscar en el path predeterminado
# Primero busca en las variables PATH definidas en cmake,
# luego en las definidas en el entorno y por ultimo en el path predeterminado

# Incude PATH
SET( CPLUS_INCLUDE_PATH $ENV{CPLUS_INCLUDE_PATH} )
IF( CPLUS_INCLUDE_PATH )
  STRING(REPLACE ":" ";" LOCAL_INCLUDE ${CPLUS_INCLUDE_PATH})
ENDIF(CPLUS_INCLUDE_PATH)

# Library Path
SET( LD_LIBRARY_PATH $ENV{LD_LIBRARY_PATH} )
IF( LD_LIBRARY_PATH )
  STRING(REPLACE ":" ";" LOCAL_LIB $ENV{LD_LIBRARY_PATH})
ENDIF( LD_LIBRARY_PATH )

# Possible location for both, We can increase this list
IF(CMAKE_SYSTEM_NAME MATCHES "Linux")
  SET( INC_PATHS
    ${LOCAL_INCLUDE}
    /usr/local/include
    /usr/include )

  SET( LIB_PATHS
    ${LOCAL_LIB}
    /usr/lib
    /usr/local/lib
    /usr/lib/x86_64-linux-gnu/
    /usr/lib32
    /usr/libx32
    )
ENDIF()

# Find where are the header files.
FIND_PATH(HDF5_INCLUDE_DIR hdf5.h
  HINTS ${HDF5_INCLUDE_PATH} "$ENV{HDF5_INCLUDE_PATH}" ${INC_PATHS}
  PATH_SUFFIXES include hdf5
  DOC "HDF5 include dir"
  )

# If found headers then look for the libraries
IF( HDF5_INCLUDE_DIR )
  FIND_LIBRARY(HDF5_LIBRARY 
    NAMES hdf5
    HINTS ${HDF5_LIBRARY_PATH} "$ENV{HDF5_LIBRARY_PATH}" ${LIB_PATHS}
    PATH_SUFFIXES lib lib64
    DOC "HDF5 library"
    )

  # Set some usefull variables.
  IF(HDF5_LIBRARY)
    SET(HDF5_FOUND ON)
    SET(HDF5_INCLUDE_DIRS ${HDF5_INCLUDE_DIR})
    
    # Esto es por si hay librerias de debug, pueden cambiarlo o eliminarlo
    FIND_LIBRARY(HDF5_LIBRARY_DEBUG 
      NAMES hdf5-gd hdf5d
      HINTS ${HDF5_LIBRARY_PATH} "$ENV{HDF5_LIBRARY_PATH}" ${LIB_PATHS}
      PATH_SUFFIXES lib lib64
      DOC "hdf5 debug library"
      )

    # Si no encuentra las librerias de debug, pues usa las mismas
    IF(NOT HDF5_LIBRARY_DEBUG)
      SET(HDF5_LIBRARY_DEBUG ${HDF5_LIBRARY})
    ENDIF(NOT HDF5_LIBRARY_DEBUG)    

    SET(HDF5_LIBRARIES optimized ${HDF5_LIBRARY} debug ${HDF5_LIBRARY_DEBUG})   
  ENDIF(HDF5_LIBRARY)
ENDIF(HDF5_INCLUDE_DIR)

# Para linea de comandos de CMake
INCLUDE(FindPackageHandleStandardArgs)
find_package_handle_standard_args(hdf5 DEFAULT_MSG
  HDF5_LIBRARY HDF5_INCLUDE_DIR)

#Esto es para que nos de las opciones por si queremos especificar a mano en avanzadas
MARK_AS_ADVANCED(HDF5_LIBRARY HDF5_LIBRARY_DEBUG HDF5_INCLUDE_DIR)
  
# Print some infrmation about the found objects
IF(HDF5_FOUND)
  MESSAGE(STATUS "HDF5 found (include: ${HDF5_INCLUDE_DIRS}, libs: ${HDF5_LIBRARIES})")
ELSEIF(HDF5_FIND_REQUIRED)
  MESSAGE(FATAL_ERROR "FindHDF5: Could not find hdf5 headers or library")
ELSE(HDF5_FOUND)
  MESSAGE(WARNING "FindHDF5 Could not find hdf5 headers or library")    
ENDIF(HDF5_FOUND)
