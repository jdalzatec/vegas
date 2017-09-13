#include "system.h"
#include <iostream>
#include <iomanip>
#include <cstdio>
#include <fstream>
#include <sstream>
#include "rlutil.h"
#include <functional>

// Message to exit and launch an error.
void EXIT(std::string message)
{
    rlutil::setColor(rlutil::LIGHTRED);
    std::cout << message << std::endl;
    std::cout << "Unsuccesful completion !!!" << std::endl;
    rlutil::resetColor();
    exit(EXIT_FAILURE);
}

std::vector<std::string> split(const std::string& s, char delim)
{
    std::stringstream ss(s);
    std::string item;
    std::vector<std::string> tokens;
    while (std::getline(ss, item, delim)) {
        tokens.push_back(item);
    }
    return tokens;
}

const std::string ETA_seconds(const Index& seconds)
{
    return "ETA: " + std::to_string(int(seconds / 3600)) + ":"
                   + std::to_string(int((seconds % 3600) / 60)) + ":"
                   + (((seconds % 60)< 10)? "0":"") + std::to_string(seconds % 60);
}

System::System(std::string fileName,
               std::vector<Real> temps,
               std::vector<Real> fields,
               Index mcs,
               Index seed,
               std::string outName,
               Real kb) : lattice_(fileName)
{
    this -> mcs_ = mcs;
    this -> kb_ = kb;
    this -> temps_ = temps;
    this -> fields_ = fields;
    this -> intRandomGenerator_ = std::uniform_int_distribution<>(0, this -> lattice_.getAtoms().size() - 1);
    this -> gaussianRandomGenerator_ = std::normal_distribution<>(0.0, 1.0);
    this -> outName_ = outName;

    this -> engine_.seed(seed);
    this -> seed_ = seed;


    for (auto&& element : this -> lattice_.getMapTypes())
    {
        this -> magnetizationType_[element.first] = ZERO;
    }

    this -> magnetizationType_["magnetization"] = ZERO;
    std::remove(outName.c_str());


    this -> reporter_ = Reporter(this -> outName_,
                                 this -> magnetizationType_,
                                 this -> lattice_,
                                 this -> temps_,
                                 this -> fields_,
                                 this -> mcs_,
                                 this -> seed_,
                                 this -> kb_);
}

System::~System()
{

}

void System::ComputeMagnetization()
{
    Array mag = ZERO;
    for (auto&& mt : this -> magnetizationType_)
        mt.second = ZERO;

    for (auto&& atom : this -> lattice_.getAtoms())
    {
        this -> magnetizationType_.at(atom.getType()) += atom.getSpin();
        mag += atom.getSpin();
    }

    this -> magnetizationType_.at("magnetization") = mag;
}

Real System::localEnergy(Index index, Real H)
{
    const Atom& atom = this -> lattice_.getAtoms().at(index);
    return this -> localEnergy(atom, H);
}

Real System::localEnergy(const Atom& atom, Real H)
{
    Real energy = 0.0;
    energy += atom.getExchangeEnergy();
    energy += atom.getAnisotropyEnergy(atom);
    energy += atom.getZeemanEnergy(H);
    return energy;
}

Real System::totalEnergy(Real H)
{
    Real exchange_energy = 0.0;
    Real other_energy = 0.0;
    for (auto&& atom : this -> lattice_.getAtoms())
    {
        exchange_energy += atom.getExchangeEnergy();
        other_energy += atom.getAnisotropyEnergy(atom);
        other_energy += atom.getZeemanEnergy(H);
    }
    return 0.5 * exchange_energy + other_energy;
}

void System::randomizeSpins(Real T)
{
    for (auto&& atom : this -> lattice_.getAtoms())
        atom.randomizeSpin(
            this -> engine_,
            this -> realRandomGenerator_,
            this -> gaussianRandomGenerator_,
            T, atom);
}


void System::monteCarloStep(Real T, Real H)
{
    
    for (Index _ = 0; _ < this -> lattice_.getAtoms().size(); ++_)
    {
        Index randIndex = this -> intRandomGenerator_(this -> engine_);
        Atom& atom = this -> lattice_.getAtoms().at(randIndex);
        Real oldEnergy = this -> localEnergy(atom, H);
        atom.randomizeSpin(this -> engine_,
            this -> realRandomGenerator_,
            this -> gaussianRandomGenerator_,
            T, atom);
        Real newEnergy = this -> localEnergy(atom, H);
        Real deltaEnergy = newEnergy - oldEnergy;

        if (deltaEnergy > 0 && this -> realRandomGenerator_(this -> engine_) > std::exp(- deltaEnergy / (this -> kb_ * T)))
            atom.revertSpin();
    }
}

void System::cycle()
{

    std::map<std::string, std::vector<Real> > histMag;
    for (auto&& item : this -> magnetizationType_)
    {
        histMag[item.first + "_x"] = std::vector<Real>(0);
        histMag[item.first + "_y"] = std::vector<Real>(0);
        histMag[item.first + "_z"] = std::vector<Real>(0);
    }

    Index initial_time = 0;
    Index final_time = 0;
    Real av_time_per_step = 0.0;

    for (Index index = 0; index < this -> temps_.size(); ++index)
    {
        initial_time = time(NULL);

        Real T = this -> temps_.at(index);
        Real H = this -> fields_.at(index);
        std::vector<Real> enes;

        for (auto&& item : histMag)
        {
            item.second.clear();
        }
        
        for (Index _ = 0; _ < this -> mcs_; ++_)
        {
            this -> monteCarloStep(T, H);
            enes.push_back(this -> totalEnergy(H));
            
            this -> ComputeMagnetization();
            auto mag = this -> magnetizationType_.at("magnetization");
                
            for (auto&& item : this -> magnetizationType_)
            {
                histMag[item.first + "_x"].push_back(item.second[0]);
                histMag[item.first + "_y"].push_back(item.second[1]);
                histMag[item.first + "_z"].push_back(item.second[2]);
            }

        }
        this -> reporter_.partial_report(enes, histMag, this -> lattice_, index);


        final_time = time(NULL);
        av_time_per_step = (av_time_per_step*index + final_time - initial_time) / (index + 1);

        rlutil::saveDefaultColor();
        rlutil::setColor(rlutil::YELLOW);

        std::cout << ETA_seconds(av_time_per_step * (this -> temps_.size() - index));
        rlutil::setColor(rlutil::LIGHTBLUE);
        std::cout << std::setprecision(5) << std::fixed;
        std::cout << "\t("
                  << 100.0 * (index + 1) / (this -> temps_.size()) 
                  << "%)";
        rlutil::resetColor();
        std::cout << "\t==>\tT = " << T << "; H = " << H << std::endl;
    }

    this -> reporter_.close();

}

Lattice& System::getLattice()
{
    return this -> lattice_;
}

Index System::getSeed() const
{
    return this -> seed_;
}

const std::map<std::string, Array>& System::getMagnetizationType() const
{
    return this -> magnetizationType_;
}

void System::setState(std::string fileState)
{
    std::ifstream file(fileState);

    Array spin;
    std::string sx;
    std::string sy;
    std::string sz;
    for (auto&& atom : this -> lattice_.getAtoms())
    {
        file >> sx >> sy >> sz;
        Array spin({atof(sx.c_str()), atof(sy.c_str()), atof(sz.c_str())});
        if (std::sqrt((spin*spin).sum()) != atom.getSpinNorm())
            EXIT("The spin norm of the site " + std::to_string(atom.getIndex()) + " does not match with the initial state given !!!");

        atom.setSpin(spin);
    }
}

void System::setAnisotropies(std::vector<std::string> anisotropyfiles)
{
    for (auto&& fileName : anisotropyfiles)
    {
        std::ifstream file(fileName);
        for (Index i = 0; i < this -> lattice_.getAtoms().size(); ++i)
        {
            std::string line;
            std::getline(file, line);
            std::vector<std::string> sep = split(line, ' ');

            if (sep.size() == 4) // add an uniaxial term
            {
                Real ax = atof(sep[0].c_str());
                Real ay = atof(sep[1].c_str());
                Real az = atof(sep[2].c_str());
                Real kan = atof(sep[3].c_str());

                std::function<Real(const Atom&)> func = [kan, ax, ay, az](const Atom& atom){
                   return - kan * (ax * atom.getSpin()[0] + ay * atom.getSpin()[1] + az * atom.getSpin()[2]) * (ax * atom.getSpin()[0] + ay * atom.getSpin()[1] + az * atom.getSpin()[2]);
                };
                this -> lattice_.getAtoms().at(i).addAnisotropyTerm(func);
            }
            else if (sep.size() == 7)
            {
                Real Ax = atof(sep[0].c_str());
                Real Ay = atof(sep[1].c_str());
                Real Az = atof(sep[2].c_str());
                Real Bx = atof(sep[3].c_str());
                Real By = atof(sep[4].c_str());
                Real Bz = atof(sep[5].c_str());

                Real Cx = Ay*Bz - Az*By;
                Real Cy = Az*Bx - Ax*Bz;
                Real Cz = Ax*By - Ay*Bx;

                Array A = {Ax, Ay, Az};
                Array B = {Bx, By, Bz};
                Array C = {Cx, Cy, Cz};
                
                Real kan = atof(sep[6].c_str());

                std::function<Real(const Atom&)> func = [kan, A, B, C](const Atom& atom){
                    return - kan * ((atom.getSpin() * A).sum()*(atom.getSpin() * A).sum()*(atom.getSpin() * B).sum()*(atom.getSpin() * B).sum()
                    + (atom.getSpin() * A).sum()*(atom.getSpin() * A).sum()*(atom.getSpin() * C).sum()*(atom.getSpin() * C).sum()
                    + (atom.getSpin() * B).sum()*(atom.getSpin() * B).sum()*(atom.getSpin() * C).sum()*(atom.getSpin() * C).sum());
                };

                this -> lattice_.getAtoms().at(i).addAnisotropyTerm(func);

            }
            else
            {
                EXIT("The anisotropy file with name " + fileName + " does not have the correct format !!!");
            }

        }
        
    }

}