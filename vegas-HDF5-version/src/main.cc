#include <iostream>
#include <fstream>
#include "jsoncpp/json/json.h"
#include <string>

#include "system.h"
#include "rlutil.h"

// enum ValueType {
//   0 nullValue = 0, ///< 'null' value
//   1 intValue,      ///< signed integer value
//   2 uintValue,     ///< unsigned integer value
//   3 realValue,     ///< double value
//   4 stringValue,   ///< UTF-8 string value
//   5 booleanValue,  ///< bool value
//   6 arrayValue,    ///< array value (ordered list)
//   7 objectValue    ///< object value (collection of name/value pairs).
// };

void EXIT(std::string message)
{
    rlutil::setColor(rlutil::LIGHTRED);
    std::cout << message << std::endl;
    std::cout << "Unsuccesful completion !!!" << std::endl;
    rlutil::resetColor();
    exit(EXIT_FAILURE);
}

void CHECK(std::string sample,
           Index mcs,
           std::string model,
           std::string anisotropy,
           const std::vector<Real>& temps,
           const std::vector<Real>& fields)
{
    std::ifstream infile(sample);
    if (!infile.good())
        EXIT("The sample file can't open or doesn't exist !!!");

    if (mcs < 10)
        EXIT("The number of MCS must be greater than 10 !!!");

    if (model != "heisenberg" and model != "ising")
        EXIT("The model must be 'ising' or 'heisenberg' !!!");

    if (anisotropy != "uniaxial" and anisotropy != "cubic")
        EXIT("The anisotropy must be 'uniaxial' or 'cubic' !!!");

    if (temps.size() != fields.size())
        EXIT("The amount of temperatures and fields are differents ( " + std::to_string(
            temps.size()) + " != " + std::to_string(fields.size()) + " )!!!");
}

void HELP()
{
    std::cout << "Usage:" << std::endl;
    std::cout << std::endl;
    std::cout << "\t./vegas FILE.JSON" << std::endl;
    std::cout << std::endl;
    std::cout << "For more information, please feel free to consult https://github.com/jdalzatec/vegas" << std::endl;
    
    exit(EXIT_FAILURE);
}

void HEADER()
{
    rlutil::saveDefaultColor();
    std::cout << std::endl;
    rlutil::setColor(rlutil::LIGHTCYAN);
    std::cout << " ________________________________________________________" << std::endl;
    std::cout << "|                                                        |" << std::endl;
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
    std::cout << " |" << std::endl;
    std::cout << "| ";
    rlutil::setColor(rlutil::LIGHTGREEN);
    std::cout << "**      Authors: Juan David Alzate Cardona          **";
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
    std::cout << "**      PCM Computational Applications - 2016       **";
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
    std::cout << "|________________________________________________________|" << std::endl;
    std::cout << std::endl;
    rlutil::resetColor();
}


int main(int argc, char const *argv[])
{
    std::cout << '\a';
    rlutil::saveDefaultColor();
    HEADER();

    if (argc != 2)
        EXIT("A JSON file is necessary !!!");

    std::string help = argv[1];
    if (help == "--help" or help == "-help")
        HELP();

    Json::Value root;
    Json::Reader reader;
    std::ifstream file(argv[1], std::ifstream::binary);
    if (!reader.parse(file, root, false))
        EXIT("The parameters file can't be open or doesn't exist !!!");

    std::string sample = root["sample"].asString();
    Index mcs = root.get("mcs", 5000).asInt();
    std::string model = root.get("model", "ising").asString();
    std::string anisotropy = root.get("anisotropy", "uniaxial").asString();
    std::string out = root.get("out", "default.h5").asString();
    Index seed = root.get("seed", Index(time(NULL))).asUInt();
    
    Real T;
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
        Index points = temps_json.get("points", 5).asUInt() - 1;
        bool cycle = temps_json.get("cycle", false).asBool();

        Real delta = (final_temp - start_temp) / points;

        if (start_temp >= final_temp)
        {
            for (T = start_temp; T >= final_temp; T += delta)
            {
                temps.push_back(T);
            }

            if (cycle)
            {
                for (T = final_temp; T <= start_temp; T -= delta)
                {
                    temps.push_back(T);
                }
            }
        }
        else
        {
            for (T = start_temp; T <= final_temp; T += delta)
            {
                temps.push_back(T);
            }

            if (cycle)
            {
                for (T = final_temp; T >= start_temp; T -= delta)
                {
                    temps.push_back(T);
                }
            }
        }
    }


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
        Index points = fields_json.get("points", 5).asUInt() - 1;
        bool cycle = fields_json.get("cycle", false).asBool();

        Real delta = (final_field - start_field) / points;

        if (start_field >= final_field)
        {
            for (H = start_field; H >= final_field; H += delta)
            {
                fields.push_back(H);
            }

            if (cycle)
            {
                for (H = final_field; H <= start_field; H -= delta)
                {
                    fields.push_back(H);
                }
            }
        }
        else
        {
            for (H = start_field; H <= final_field; H += delta)
            {
                fields.push_back(H);
            }

            if (cycle)
            {
                for (H = final_field; H >= start_field; H -= delta)
                {
                    fields.push_back(H);
                }
            }
        }
    }

    if (unique_T and unique_H)
    {
        temps.push_back(T);
        fields.push_back(H);
    }
    else if (unique_T and !unique_H)
    {
        for (auto&& _ : fields)
        {
            _ = _;
            temps.push_back(T);
        }
    }
    else if (!unique_T and unique_H)
    {
        for (auto&& _ : temps)
        {
            _ = _;
            fields.push_back(H);
        }
    }

    
    CHECK(sample, mcs, model, anisotropy, temps, fields);

    System system_(sample, model, temps, fields, mcs, seed, out);
    system_.randomizeSpins();

    std::cout << "\t\tSample file           = " << sample << std::endl;
    std::cout << "\t\tNum MCS               = " << mcs << std::endl;
    std::cout << "\t\tAnisotropy            = " << anisotropy << std::endl;
    std::cout << "\t\tModel                 = " << model << std::endl;
    std::cout << "\t\tOut file              = " << out << std::endl;
    std::cout << std::endl;
    std::cout << "\t\tNum Ions              = " << system_.getLattice().getAtoms().size() << std::endl;
    std::cout << "\t\tNum Surface Ions      = " << system_.getLattice().getSurfaceAtoms().size() << std::endl;
    std::cout << "\t\tNum Core Ions         = " << system_.getLattice().getCoreAtoms().size() << std::endl;
    for (auto&& type : system_.getLattice().getMapTypes())
    {
        std::cout << "\t\tNum " << type.first << " Ions";
        for (Index i = 0; i < 14 - type.first.size() - 1; ++i)
        {
            std::cout << " ";
        }
        std::cout << "= " << type.second << std::endl;
    }

    std::cout << "\t\tkB                    = " << Kb << std::endl;
    std::cout << "\t\tseed                  = " << system_.getSeed() << std::endl;

    std::cout << std::endl;

    if (anisotropy == "uniaxial")
    {
        system_.cycle_netcdf_ani_uniaxial();
    }
    else if (anisotropy == "cubic")
    {
        system_.cycle_netcdf_ani_cubic();
    }

    rlutil::setColor(rlutil::LIGHTGREEN);
    std::cout << "Succesful completion !!!" << std::endl;
    rlutil::resetColor();
    std::cout << '\a';
    return 0;
}