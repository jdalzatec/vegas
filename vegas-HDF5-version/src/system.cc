#include "system.h"
#include <iostream>
#include <cstdio>
#include <fstream>
#include "rlutil.h"

const std::string ETA_seconds(const Index& seconds)
{
    return "ETA: " + std::to_string(int(seconds / 3600)) + ":"
                   + std::to_string(int((seconds % 3600) / 60)) + ":"
                   + std::to_string(seconds % 60);
}

System::System(std::string fileName,
               std::string model,
               std::vector<Real> temps,
               std::vector<Real> fields,
               Index mcs,
               Index seed,
               std::string outName) : lattice_(fileName)
{
    this -> mcs_ = mcs;
    this -> model_ = model;
    this -> temps_ = temps;
    this -> fields_ = fields;
    this -> intRandomGenerator_ = std::uniform_int_distribution<>(0, this -> lattice_.getAtoms().size() - 1);
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

Real System::localEnergy_ani_uniaxial(Index index, Real H)
{
    const Atom& atom = this -> lattice_.getAtoms().at(index);
    return this -> localEnergy_ani_uniaxial(atom, H);
}

Real System::localEnergy_ani_uniaxial(const Atom& atom, Real H)
{
    Real energy = 0.0;
    Index nbh_c = 0;
    for (auto&& nbh : atom.getNbhs())
        energy -= atom.getExchanges().at(nbh_c++) * (atom.getSpin() * nbh -> getSpin()).sum();
    energy -= atom.getKan() * ((atom.getAnisotropyUnit() * atom.getSpin()).sum() * (atom.getAnisotropyUnit() * atom.getSpin()).sum());
    energy -= H * (atom.getSpin() * atom.getExternalField()).sum();
    return energy;
}

Real System::localEnergy_ani_cubic(Index index, Real H)
{
    const Atom& atom = this -> lattice_.getAtoms().at(index);
    return this -> localEnergy_ani_cubic(atom, H);
}

Real System::localEnergy_ani_cubic(const Atom& atom, Real H)
{
    Real energy = 0.0;
    Index nbh_c = 0;
    for (auto&& nbh : atom.getNbhs())
        energy -= atom.getExchanges().at(nbh_c++) * (atom.getSpin() * nbh -> getSpin()).sum();
    energy -= atom.getKan() * ((atom.getAnisotropyUnit() * atom.getSpin()).sum() * (atom.getAnisotropyUnit() * atom.getSpin()).sum());

    if (atom.isSurface() == false)
    {       
        double sx = atom.getSpin()[0];
        double sy = atom.getSpin()[1];
        double sz = atom.getSpin()[2];

        energy -= atom.getKan() * (sx * sx * sy * sy + sy * sy * sz * sz + sx * sx * sz * sz);
    }

    energy -= H * (atom.getSpin() * atom.getExternalField()).sum();
    return energy;
}

Real System::totalEnergy_ani_uniaxial(Real H)
{
    Real exchange_energy = 0.0;
    Real other_energy = 0.0;
    for (auto&& atom : this -> lattice_.getAtoms())
    {
        Index nbh_c = 0;
        for (auto&& nbh : atom.getNbhs())
            exchange_energy -= atom.getExchanges().at(nbh_c++) * (atom.getSpin() * nbh -> getSpin()).sum();
        other_energy -= atom.getKan() * ((atom.getAnisotropyUnit() * atom.getSpin()).sum() * (atom.getAnisotropyUnit() * atom.getSpin()).sum());
        other_energy -= H * (atom.getSpin() * atom.getExternalField()).sum();
    }
    return 0.5 * exchange_energy + other_energy;
}

Real System::totalEnergy_ani_cubic(Real H)
{
    Real exchange_energy = 0.0;
    Real other_energy = 0.0;
    for (auto&& atom : this -> lattice_.getAtoms())
    {
        Index nbh_c = 0;
        for (auto&& nbh : atom.getNbhs())
            exchange_energy -= atom.getExchanges().at(nbh_c++) * (atom.getSpin() * nbh -> getSpin()).sum();
        other_energy -= atom.getKan() * ((atom.getAnisotropyUnit() * atom.getSpin()).sum() * (atom.getAnisotropyUnit() * atom.getSpin()).sum());

        if (atom.isSurface() == false)
        {       
            double sx = atom.getSpin()[0];
            double sy = atom.getSpin()[1];
            double sz = atom.getSpin()[2];

            other_energy -= atom.getKan() * (sx * sx * sy * sy + sy * sy * sz * sz + sx * sx * sz * sz);
        }

        other_energy -= H * (atom.getSpin() * atom.getExternalField()).sum();
    }
    return 0.5 * exchange_energy + other_energy;
}

void System::randomizeSpins()
{
    if (this -> model_ == "heisenberg")
    {
        for (auto&& atom : this -> lattice_.getAtoms())
            atom.setSpin(this -> randomUnitArray() * atom.getSpinNorm());
    }
    else if (this -> model_ == "ising")
    {
        for (auto&& atom : this -> lattice_.getAtoms())
        {
            Index S = int(this -> realRandomGenerator_(this -> engine_) * atom.getProjections().size());
            atom.setSpin({0.0, 0.0, atom.getPossibleProjections()[S]});
            atom.removePossibleProjection(S);
        }
    }
}

Array System::randomUnitArray()
{
    Real phi = 2.0 * M_PI * this -> realRandomGenerator_(this -> engine_);
    Real theta = std::acos(2.0 * realRandomGenerator_(this -> engine_) - 1.0);
    Array unitArray({std::sin(theta) * std::cos(phi), std::sin(theta) * std::sin(phi), std::cos(theta)});
    return unitArray;
}

void System::monteCarloStep_ani_uniaxial(Real T, Real H)
{
    for (Index _ = 0; _ < this -> lattice_.getAtoms().size(); ++_)
    {
        Index randIndex = this -> intRandomGenerator_(this -> engine_);
        Atom& atom = this -> lattice_.getAtoms().at(randIndex);
        Array oldSpin = atom.getSpin();
        Real oldEnergy = this -> localEnergy_ani_uniaxial(atom, H);
        atom.setSpin(this -> randomUnitArray() * atom.getSpinNorm());
        Real newEnergy = this -> localEnergy_ani_uniaxial(atom, H);
        Real deltaEnergy = newEnergy - oldEnergy;

        if (deltaEnergy > 0 && this -> realRandomGenerator_(this -> engine_) > std::exp(- deltaEnergy / (Kb * T)))
            atom.setSpin(oldSpin);
    }
}

void System::monteCarloStep_ani_uniaxial_ising(Real T, Real H)
{
    for (Index _ = 0; _ < this -> lattice_.getAtoms().size(); ++_)
    {
        Index randIndex = this -> intRandomGenerator_(this -> engine_);
        Atom& atom = this -> lattice_.getAtoms().at(randIndex);
        Real oldSpin = atom.getSpin()[2];
        Real oldEnergy = this -> localEnergy_ani_uniaxial(atom, H);

        Index S = int(this -> realRandomGenerator_(this -> engine_) * atom.getPossibleProjections().size());
        Real newSpin = atom.getPossibleProjections()[S];
        atom.setSpin({0.0, 0.0, newSpin});
        atom.changeProjection(S, oldSpin);

        Real newEnergy = this -> localEnergy_ani_uniaxial(atom, H);
        Real deltaEnergy = newEnergy - oldEnergy;

        if (deltaEnergy > 0 && this -> realRandomGenerator_(this -> engine_) > std::exp(- deltaEnergy / (Kb * T)))
        {
            atom.setSpin({0.0, 0.0, oldSpin});
            atom.changeProjection(S, newSpin);
        }
    }
}

void System::monteCarloStep_ani_cubic(Real T, Real H)
{
    for (Index _ = 0; _ < this -> lattice_.getAtoms().size(); ++_)
    {
        Index randIndex = this -> intRandomGenerator_(this -> engine_);
        Atom& atom = this -> lattice_.getAtoms().at(randIndex);
        Array oldSpin = atom.getSpin();
        Real oldEnergy = this -> localEnergy_ani_cubic(atom, H);
        atom.setSpin(this -> randomUnitArray() * atom.getSpinNorm());
        Real newEnergy = this -> localEnergy_ani_cubic(atom, H);
        Real deltaEnergy = newEnergy - oldEnergy;

        if (deltaEnergy > 0 && this -> realRandomGenerator_(this -> engine_) > std::exp(- deltaEnergy / (Kb * T)))
            atom.setSpin(oldSpin);
    }
}

void System::cycle_netcdf_ani_uniaxial()
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

    if (this -> model_ == "heisenberg")
    {
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
                this -> monteCarloStep_ani_uniaxial(T, H);
                enes.push_back(this -> totalEnergy_ani_uniaxial(H));
                
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
            std::cout << " ("
                      << 100.0 * (index + 1) / (this -> temps_.size())
                      << "%)";
            rlutil::resetColor();
            std::cout << " ==> T = " << T << "; H = " << H << std::endl;
        }
    }
    else if (this -> model_ == "ising")
    {
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
                this -> monteCarloStep_ani_uniaxial_ising(T, H);
                enes.push_back(this -> totalEnergy_ani_uniaxial(H));
                
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
            std::cout << " ("
                      << 100.0 * (index + 1) / (this -> temps_.size())
                      << "%)";
            rlutil::resetColor();
            std::cout << " ==> T = " << T << "; H = " << H << std::endl;
        }
    }

    this -> reporter_.close();

}

void System::cycle_netcdf_ani_cubic()
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
            this -> monteCarloStep_ani_cubic(T, H);
            enes.push_back(this -> totalEnergy_ani_cubic(H));
            
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
        std::cout << " ("
                  << 100.0 * (index + 1) / (this -> temps_.size())
                  << "%)";
        rlutil::resetColor();
        std::cout << " ==> T = " << T << "; H = " << H << std::endl;
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