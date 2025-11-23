#ifndef STARTER_H
#define STARTER_H

#include "params.h"
#include "system.h"
#include "rlutil.h"

#include <iostream>
#include <fstream>
#include <string>
#include <tuple>

#include "json/json.h"

namespace STARTER {
    // Message to exit and launch an error.
    void EXIT(std::string message);

    // Function to check some regular issues
    void CHECK(std::string sample,
               Index mcs,
               const std::vector<Real>& temps,
               const std::vector<Real>& fields);

    // Fn case that the initial state is given,
    // this function checks if the file exists.
    void CHECKFILE(std::string filename);



    // Function to print the header
    void HEADER();

    // Function to print the initial values
    void PRINT_VALUES(System& system_,
                      const std::string& sample,
                      const Index& mcs,
                      const std::string& out,
                      const Real& kb,
                      const Index& seed,
                      const std::string& initialstate,
                      const std::vector<std::string>& anisotropyfiles);



    // Function to create a system from a json file
    System CREATE_SYSTEM(std::string jsonfile, bool print);
}

#endif // STARTER_H
