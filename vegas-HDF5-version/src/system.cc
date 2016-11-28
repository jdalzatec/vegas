#include "system.h"
#include <iostream>
#include <iomanip>
#include <cstdio>
#include <fstream>
#include "rlutil.h"

const std::string ETA_seconds(const Index& seconds)
{
    return "ETA: " + std::to_string(int(seconds / 3600)) + ":"
                   + std::to_string(int((seconds % 3600) / 60)) + ":"
                   + (((seconds % 60)< 10)? "0":"") + std::to_string(seconds % 60);
}

System::System(std::string fileName,
               std::string model,
               std::vector<Real> temps,
               std::vector<Real> fields,
               Index mcs,
               Index seed,
               std::string outName,
               Real Kb) : lattice_(fileName)
{
    this -> mcs_ = mcs;
    this -> Kb = Kb;
    this -> model_ = model;
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

    this -> magnetizationType_["surface"] = ZERO;
    this -> magnetizationType_["core"] = ZERO;
    this -> magnetizationType_["magnetization"] = ZERO;
    std::remove(outName.c_str());


    this -> reporter_ = Reporter(this -> outName_,
                                 this -> magnetizationType_,
                                 this -> lattice_,
                                 this -> temps_,
                                 this -> fields_,
                                 this -> mcs_,
                                 this -> seed_);
}

System::~System()
{

}

Array System::magnetization()
{
    Array mag = ZERO;

    for (auto&& mt : this -> magnetizationType_)
        mt.second = ZERO;

    for (auto&& atom : this -> lattice_.getAtoms())
    {
        this -> magnetizationType_.at(atom.getType()) += atom.getSpin();
        mag += atom.getSpin();
    }

    for (auto&& atom : this -> lattice_.getSurfaceAtoms())
    {
        this -> magnetizationType_.at("surface") += atom -> getSpin();
    }

    this -> magnetizationType_.at("core") = mag - this -> magnetizationType_.at("surface");
    this -> magnetizationType_.at("magnetization") = mag;

    return mag;
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
            (this -> Kb) * T, atom);
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
            (this -> Kb) * T, atom);
        Real newEnergy = this -> localEnergy(atom, H);
        Real deltaEnergy = newEnergy - oldEnergy;

        if (deltaEnergy > 0 && this -> realRandomGenerator_(this -> engine_) > std::exp(- deltaEnergy / (Kb * T)))
            atom.revertSpin();
    }
}

void System::cycle_netcdf()
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
            
            auto mag = this -> magnetization();
                
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