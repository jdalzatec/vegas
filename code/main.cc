#include "config.h"

#include <iostream>
#include <fstream>
#include <string>
#include <tuple>
#include "system.h"

// Library to manage the console colors
#include "rlutil.h"

#include "starter.h"


// Many functions for checking, errors and read the information were
// defined in a namespace STARTER into the file starter.h
using namespace STARTER;


// Function to print the information about the webpage of vegas
void HELP()
{
    std::cout << "Usage:" << std::endl;
    std::cout << std::endl;
    std::cout << "\t./vegas FILE.JSON" << std::endl;
    std::cout << std::endl;
    std::cout << "For more information, please feel free to "
              << "consult https://github.com/jdalzatec/vegas" << std::endl;
    exit(EXIT_FAILURE);
}

int main(int argc, char const *argv[])
{
    std::cout << '\a';
    rlutil::saveDefaultColor();
    HEADER();

    // An Json file is necessary to run vegas.
    // This should be given like an argument.
    if (argc != 2)
        EXIT("A JSON file is necessary !!!");

    // If '--help' or "-help" is given like argument,
    // the HELP() function is executed.
    std::string help = argv[1];
    if (help == "--help" or help == "-help")
        HELP();

    // The second argument is to know if the values should be printed.
    System system_ = CREATE_SYSTEM(argv[1], true);

    // The simulation is ran with this command:
    system_.cycle();

    // An announcement is printed to inform that the simulation has ended. 
    rlutil::setColor(rlutil::LIGHTGREEN);
    std::cout << "Succesful completion !!!" << std::endl;
    rlutil::resetColor();
    std::cout << '\a';
    return 0;
}