# Find jsoncpp
#
# Find the jsoncpp includes and library
# 
# if you nee to add a custom library search path, do it via via CMAKE_PREFIX_PATH 
# 
# This module defines
#  JSONCPP_INCLUDE_DIRS, where to find header, etc.
#  JSONCPP_LIBRARIES, the libraries needed to use jsoncpp.
#  JSONCPP_FOUND, If false, do not try to use jsoncpp.

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
FIND_PATH(JSONCPP_INCLUDE_DIR json.h
  HINTS ${JSONCPP_INCLUDE_PATH} "$ENV{JSONCPP_INCLUDE_PATH}" ${INC_PATHS}
  PATH_SUFFIXES include json
  DOC "jsoncpp include dir"
  )

# If found headers then look for the libraries
IF( JSONCPP_INCLUDE_DIR )
  FIND_LIBRARY(JSONCPP_LIBRARY 
    NAMES jsoncpp
    HINTS ${JSONCPP_LIBRARY_PATH} "$ENV{JSONCPP_LIBRARY_PATH}" ${LIB_PATHS}
    PATH_SUFFIXES lib lib64
    DOC "jsoncpp library"
    )

  # Set some usefull variables.
  IF(JSONCPP_LIBRARY)
    SET(JSONCPP_FOUND ON)
    SET(JSONCPP_INCLUDE_DIRS ${JSONCPP_INCLUDE_DIR})
    
    # Esto es por si hay librerias de debug, pueden cambiarlo o eliminarlo
    FIND_LIBRARY(JSONCPP_LIBRARY_DEBUG 
      NAMES jsoncpp-gd jsoncppd
      HINTS ${JSONCPP_LIBRARY_PATH} "$ENV{JSONCPP_LIBRARY_PATH}" ${LIB_PATHS}
      PATH_SUFFIXES lib lib64
      DOC "jsoncpp debug library"
      )

    # Si no encuentra las librerias de debug, pues usa las mismas
    IF(NOT JSONCPP_LIBRARY_DEBUG)
      SET(JSONCPP_LIBRARY_DEBUG ${JSONCPP_LIBRARY})
    ENDIF(NOT JSONCPP_LIBRARY_DEBUG)    

    SET(JSONCPP_LIBRARIES optimized ${JSONCPP_LIBRARY} debug ${JSONCPP_LIBRARY_DEBUG})   
  ENDIF(JSONCPP_LIBRARY)
ENDIF(JSONCPP_INCLUDE_DIR)

# Para linea de comandos de CMake
INCLUDE(FindPackageHandleStandardArgs)
find_package_handle_standard_args(jsoncpp DEFAULT_MSG
  JSONCPP_LIBRARY JSONCPP_INCLUDE_DIR)

#Esto es para que nos de las opciones por si queremos especificar a mano en avanzadas
MARK_AS_ADVANCED(JSONCPP_LIBRARY JSONCPP_LIBRARY_DEBUG JSONCPP_INCLUDE_DIR)
  
# Print some infrmation about the found objects
IF(JSONCPP_FOUND)
  MESSAGE(STATUS "jsoncpp found (include: ${JSONCPP_INCLUDE_DIRS}, libs: ${JSONCPP_LIBRARIES})")
ELSEIF(JSONCPP_FIND_REQUIRED)
  MESSAGE(FATAL_ERROR "Findjsoncpp: Could not find jsoncpp headers or library")
ELSE(JSONCPP_FOUND)
  MESSAGE(WARNING "Findjsoncpp Could not find jsoncpp headers or library")    
ENDIF(JSONCPP_FOUND)
