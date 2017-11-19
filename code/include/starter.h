#include <iostream>
#include <fstream>
#include <string>
#include <tuple>
#include "params.h"
#include "system.h"

// Library to manage the console colors
#include "rlutil.h"

namespace STARTER{
    // Message to exit and launch an error.
    void EXIT(std::string message)
    {
        rlutil::setColor(rlutil::LIGHTRED);
        std::cout << message << std::endl;
        std::cout << "Unsuccesful completion !!!" << std::endl;
        rlutil::resetColor();
        exit(EXIT_FAILURE);
    }

    // Function to check some regular issues
    void CHECK(std::string sample,
               Index mcs,
               const std::vector<Real>& temps,
               const std::vector<Real>& fields)
    {
        std::ifstream infile(sample);
        if (!infile.good())
            EXIT("The sample file can't open or doesn't exist !!!");

        if (mcs < 10)
            EXIT("The number of MCS must be greater than 10 !!!");

        if (temps.size() != fields.size())
            EXIT("The amount of temperatures and fields are differents ( " +
                std::to_string(
                temps.size()) + " != " + std::to_string(fields.size()) + " )!!!");
    }

    // Fn case that the initial state is given,
    // this function checks if the file exists.
    void CHECKFILE(std::string filename)
    {
        std::ifstream infile(filename);
        if (!infile.good())
            EXIT("The initial state file can't open or doesn't exist !!!");

    }



    // Function to print the header
    void HEADER()
    {
        rlutil::saveDefaultColor();
        std::cout << std::endl;
        rlutil::setColor(rlutil::LIGHTCYAN);
        std::cout << " ________________________________________________________"
                  << std::endl;
        std::cout << "|                                                        |"
                  << std::endl;
        std::cout << "| ";
        rlutil::setColor(rlutil::LIGHTGREEN);
        std::cout << "******************************************************";
        rlutil::setColor(rlutil::LIGHTCYAN);
        std::cout << " |" << std::endl;
        std::cout << "| ";
        rlutil::setColor(rlutil::LIGHTGREEN);
        std::cout << "**                                                  **";
        rlutil::setColor(rlutil::LIGHTCYAN);
        std::cout << " |" << std::endl;
        std::cout << "| ";
        rlutil::setColor(rlutil::LIGHTGREEN);
        std::cout << "**                   ";
        rlutil::setColor(rlutil::LIGHTRED);
        std::cout << "VEGAS";
        rlutil::setColor(rlutil::LIGHTGREEN);
        std::cout << "                          **";
        rlutil::setColor(rlutil::LIGHTCYAN);
        std::cout << " |" << std::endl;
        std::cout << "| ";
        rlutil::setColor(rlutil::LIGHTGREEN);
        std::cout << "**                                                  **";
        rlutil::setColor(rlutil::LIGHTCYAN);
        std::cout <<" |" << std::endl;
        std::cout << "| ";
        rlutil::setColor(rlutil::LIGHTGREEN);
        std::cout << "**      PCM Computational Applications - 2017       **";
        rlutil::setColor(rlutil::LIGHTCYAN);
        std::cout <<" |" << std::endl;
        std::cout << "| ";
        rlutil::setColor(rlutil::LIGHTGREEN);
        std::cout << "**                                                  **";
        rlutil::setColor(rlutil::LIGHTCYAN);
        std::cout <<" |" << std::endl;
        std::cout << "| ";
        rlutil::setColor(rlutil::LIGHTGREEN);
        std::cout << "**                                                  **";
        rlutil::setColor(rlutil::LIGHTCYAN);
        std::cout <<" |" << std::endl;
        std::cout << "| ";
        rlutil::setColor(rlutil::LIGHTGREEN);
        std::cout << "******************************************************";
        rlutil::setColor(rlutil::LIGHTCYAN);
        std::cout << " |" << std::endl;
        std::cout << "|_______________________________"
                  << "_________________________|"
                  << std::endl;
        std::cout << std::endl;
        rlutil::resetColor();
    }


    void PRINT_VALUES(System& system_,
                      const std::string& sample,
                      const Index& mcs,
                      const std::string& out,
                      const Real& kb,
                      const Index& seed,
                      const std::string& initialstate,
                      const std::vector<std::string>& anisotropyfiles)
    {
        // The initial values are printed for the user visualization.
        std::cout << "\t\tSample file = \n\t\t\t" << sample << std::endl;
        std::cout << "\t\tNum MCS = \n\t\t\t" << mcs << std::endl;
        std::cout << "\t\tOut file = \n\t\t\t" << out << std::endl;
        if (initialstate != "")
        {
            std::cout << "\t\tInitial state file = \n\t\t\t" << initialstate << std::endl;
        }
        if (anisotropyfiles.size() != 0)
        {
            for (auto&& anisotropyfile : anisotropyfiles)
                std::cout << "\t\tAnisotropy file = \n\t\t\t" << anisotropyfile << std::endl;
        }

        std::cout << std::endl;
        std::cout << "\t\tNum Ions = \n\t\t\t" << system_.getLattice().getAtoms().size() << std::endl;
        
        // The amount of ions are printed for type ion.
        for (auto&& type : system_.getLattice().getMapTypes())
        {
            std::cout << "\t\tNum " << type.first << " Ions  = \n\t\t\t" << type.second << std::endl;
        }

        std::cout << "\t\tkb = \n\t\t\t" << kb << std::endl;
        std::cout << "\t\tseed = \n\t\t\t" << system_.getSeed() << std::endl;

        std::cout << std::endl;
        std::cout << std::endl;
    }


    System CREATE_SYSTEM(std::string jsonfile, bool print)
    {
        // Read the json file which was passed like argument and
        // check if the format is correct.
        // If the file doesn't exist or the format is wrong,
        // an error is launched.
        Json::Value root;
        Json::Reader reader;
        std::ifstream file(jsonfile, std::ifstream::binary);
        if (!reader.parse(file, root, false))
            EXIT("The parameters file can't be open or doesn't exist !!!");

        // Put the name of the sample into the variable 'sample'
        std::string sample = root["sample"].asString();

        // Put the amount of Monte Carlo Steps (MCS) into the variable 'mcs'.
        // By default the amount of MCS is 5000.
        Index mcs = root.get("mcs", 5000).asInt();

        // Put the value of kb into the variable 'kb'.
        // By default the value of kb is 1.0.
        Real kb = root.get("kb", 1.0).asDouble();

        // Put the output name into the variable 'out'.
        // By default the value of out is the sample name
        // plus the extension '.h5'.
        std::string out = root.get("out", sample + ".h5").asString();

        // Put the seed value into the variable 'seed'.
        // By default the value of seed is the actual time.
        Index seed = root.get("seed", Index(time(NULL))).asUInt();

        // The temperature can be given like a constant or a vector.
        // An array of temperatures must be created in the case that
        // the temperature is given like a constant.
        // The type of the cell temperature of the Json file is got, where
        // 1, 2 and 3 are numerical types, and 6 corresponds to an array type.
        // If the type is 7 means that the temperature was given like a dictionary.
        Real T;

        // By default, we consider that the temperature will be a constant.
        // If the variable 'unique_T' is true means we only have one value for
        // the temperature.
        bool unique_T = true;

        std::vector<Real> temps(0);
        if (root.get("temperature", 0.0).type() == 1)
        {
            T = root.get("temperature", 0.0).asInt();
        }
        else if (root.get("temperature", 0.0).type() == 2)
        {
            T = root.get("temperature", 0.0).asUInt();
        }
        else if (root.get("temperature", 0.0).type() == 3)
        {
            T = root.get("temperature", 0.0).asDouble();
        }
        else if (root.get("temperature", 0.0).type() == 6)
        {
            // As the temperature was given like a vector in the Json file,
            // the value of 'unique_T' is changed to false and we read the values
            // of the temperature array and put these into the 'temp' vector.
            unique_T = false;
            const Json::Value temps_json = root["temperature"];
            for (Index i = 0; i < temps_json.size(); ++i)
            {
                temps.push_back(temps_json[i].asDouble());
            }
        }
        else if (root.get("temperature", 0.0).type() == 7)
        {
            unique_T = false;
            const Json::Value temps_json = root["temperature"];
            Real start_temp = temps_json.get("start", 0.001).asDouble();
            Real final_temp = temps_json.get("final", 10.0).asDouble();
            bool cycle = temps_json.get("cycle", false).asBool();

            Index points = temps_json.get("points", 5).asUInt();
            Real delta = (final_temp - start_temp) / Real(points - 1);

            if (temps_json.isMember("points") == true && temps_json.isMember("delta") == true)
            {
                EXIT("Temperature section in Json is not consistent because 'points' and 'delta' were given at the same time !!!");
            }
            else if (temps_json.isMember("points") == false && temps_json.isMember("delta") == true)
            {
                delta = temps_json.get("delta", 0.1).asDouble();
                if ((((final_temp - start_temp) / delta + 1) <= 0) || delta == 0.0)
                    EXIT("Temperature section in Json has a invalid value for 'delta' !!!");
                points = (final_temp - start_temp) / delta + 1;
            }

            Real T = start_temp;
            for (Index _ = 0; _ < points; ++_)
            {
                temps.push_back(T);
                T += delta;
            }
            T -= 2*delta;
            if (cycle)
            {
                for (Index _ = 0; _ < (points - 1); ++_)
                {
                    temps.push_back(T);
                    T -= delta;
                }
            }

        }

        // As we proceed with the temperature, we need to do the same but now
        // with the field.
        Real H;
        bool unique_H = true;
        std::vector<Real> fields(0);
        if (root.get("field", 0.0).type() == 1)
        {
            H = root.get("field", 0.0).asInt();
        }
        else if (root.get("field", 0.0).type() == 2)
        {
            H = root.get("field", 0.0).asUInt();
        }
        else if (root.get("field", 0.0).type() == 3)
        {
            H = root.get("field", 0.0).asDouble();
        }
        else if (root.get("field", 0.0).type() == 6)
        {
            unique_H = false;
            const Json::Value fields_json = root["field"];
            for (Index i = 0; i < fields_json.size(); ++i)
            {
                fields.push_back(fields_json[i].asDouble());
            }
        }
        else if (root.get("field", 0.0).type() == 7)
        {
            unique_H = false;
            const Json::Value fields_json = root["field"];
            Real start_field = fields_json.get("start", 0.001).asDouble();
            Real final_field = fields_json.get("final", 10.0).asDouble();
            bool cycle = fields_json.get("cycle", false).asBool();

            Index points = fields_json.get("points", 5).asUInt();
            Real delta = (final_field - start_field) / Real(points - 1);

            if (fields_json.isMember("points") == true && fields_json.isMember("delta") == true)
            {
                EXIT("Field section in Json is not consistent because 'points' and 'delta' were given at the same time !!!");
            }
            else if (fields_json.isMember("points") == false && fields_json.isMember("delta") == true)
            {
                delta = fields_json.get("delta", 0.1).asDouble();
                if ((((final_field - start_field) / delta + 1) <= 0) || delta == 0.0)
                    EXIT("Field section in Json has a invalid value for 'delta' !!!");
                points = (final_field - start_field) / delta + 1;
            }

            Real H = start_field;
            for (Index _ = 0; _ < points; ++_)
            {
                fields.push_back(H);
                H += delta;
            }
            H -= 2*delta;
            if (cycle)
            {
                for (Index _ = 0; _ < (points - 1); ++_)
                {
                    fields.push_back(H);
                    H -= delta;
                }
            }
        }


        // The vectors 'temps' and 'fields' must have the same size.
        // In the case that we have one temperature and one field, the vectors
        // 'temps' and 'fields' only have one element.
        // If we have one temperature and many fields, the vector 'temps' is fulled
        // with the same value of temperature. The same thing in the case of one
        // field and many temperatures.
        if (unique_T and unique_H)
        {
            temps.push_back(T);
            fields.push_back(H);
        }
        else if (unique_T and !unique_H)
        {
            for (auto&& _ : fields)
            {
                _ = _;  // This  line is to ignore warnings of unused variable.
                temps.push_back(T);
            }
        }
        else if (!unique_T and unique_H)
        {
            for (auto&& _ : temps)
            {
                _ = _;  // This  line is to ignore warnings of unused variable.
                fields.push_back(H);
            }
        }

        // In this point we check if the values of sample name, MCS, temps and
        // fields are fine.
        CHECK(sample, mcs, temps, fields);

        // Create the system with the previous values.
        System system_(sample, temps, fields, mcs, seed, out, kb);

        // In case that an initial state is given in the Json file,
        // we checked it. If this is not given, the initial
        // state is generated randomly.
        std::string initialstate = root.get("initialstate", "").asString();
        if (root.isMember("initialstate") == false)
        {
            system_.randomizeSpins();
        }
        else
        {
            CHECKFILE(root.get("initialstate", "").asString());
            system_.setState(root.get("initialstate", "").asString());
        }


        std::vector<std::string> anisotropyfiles;
        if (root.isMember("anisotropy") == true)
        {
            if (root.get("anisotropy", 0.0).type() == 4) // just a string
            {
                std::string anisotropyfile = root.get("anisotropy", "").asString();
                CHECKFILE(anisotropyfile);
                anisotropyfiles.push_back(anisotropyfile);
            }
            else if (root.get("anisotropy", 0.0).type() == 6) // a set of strings
            {
                const Json::Value files = root["anisotropy"];
                for (Index i = 0; i < files.size(); ++i)
                {
                    std::string anisotropyfile = files[i].asString();
                    CHECKFILE(anisotropyfile);
                    anisotropyfiles.push_back(anisotropyfile);
                }
            }
        }
        system_.setAnisotropies(anisotropyfiles);

        if (print)
            PRINT_VALUES(system_, sample, mcs, out, kb, mcs, initialstate, anisotropyfiles);

        return system_;
    }

    


}