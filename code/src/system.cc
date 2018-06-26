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
    return "ETR: " + std::to_string(int(seconds / 3600)) + ":"
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

    this -> num_types_ = this -> lattice_.getMapTypeIndexes().size();

    this -> engine_.seed(seed);
    this -> seed_ = seed;

    this -> sigma_ = std::vector<Real>(this -> num_types_);
    this -> counterRejections_ = std::vector<Index>(this -> num_types_);
    this -> magnetizationByTypeIndex_ = std::vector<Array>(this -> num_types_ + 1);
    for (Index i = 0; i < this -> sigma_.size(); ++i)
    {
        this -> sigma_.at(i) = 60.0;
        this -> counterRejections_.at(i) = 0;
        this -> magnetizationByTypeIndex_.at(i) = ZERO;
    }
    this -> magnetizationByTypeIndex_.at(this -> num_types_) = ZERO; // for total magnetization

    std::remove(outName.c_str());


    this -> reporter_ = Reporter(this -> outName_,
                                 this -> magnetizationByTypeIndex_,
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
    for (auto& val : this -> magnetizationByTypeIndex_)
        val = 0.0;

    for (auto& atom : this -> lattice_.getAtoms())
    {
        this -> magnetizationByTypeIndex_.at(atom.getTypeIndex()) += atom.getSpin();
        this -> magnetizationByTypeIndex_.at(this -> num_types_) += atom.getSpin();
    }
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
    for (auto& atom : this -> lattice_.getAtoms())
    {
        exchange_energy += atom.getExchangeEnergy();
        other_energy += atom.getAnisotropyEnergy(atom);
        other_energy += atom.getZeemanEnergy(H);
    }
    return 0.5 * exchange_energy + other_energy;
}

void System::randomizeSpins()
{
    for (auto& atom : this -> lattice_.getAtoms())
        atom.randomInitialState(this -> engine_,
            this -> realRandomGenerator_,
            this -> gaussianRandomGenerator_,
            atom);
}


void System::monteCarloStep(Real T, Real H)
{
    Index num = Index(this -> realRandomGenerator_(this -> engine_) * 5);
    for (Index _ = 0; _ < this -> lattice_.getAtoms().size(); ++_)
    {
        Index randIndex = this -> intRandomGenerator_(this -> engine_);
        Atom& atom = this -> lattice_.getAtoms().at(randIndex);
        Real oldEnergy = this -> localEnergy(atom, H);
        atom.randomizeSpin(this -> engine_,
            this -> realRandomGenerator_,
            this -> gaussianRandomGenerator_,
            this -> sigma_.at(atom.getTypeIndex()), atom, num);
        Real newEnergy = this -> localEnergy(atom, H);
        Real deltaEnergy = newEnergy - oldEnergy;

        if (deltaEnergy > 0 && this -> realRandomGenerator_(this -> engine_) > std::exp(- deltaEnergy / (this -> kb_ * T)))
        {
            atom.revertSpin();
            this -> counterRejections_.at(atom.getTypeIndex()) += 1;
        }
    }
}

void System::cycle()
{

    std::vector< std::vector<Real> > histMag_x(this -> num_types_ + 1);
    std::vector< std::vector<Real> > histMag_y(this -> num_types_ + 1);
    std::vector< std::vector<Real> > histMag_z(this -> num_types_ + 1);

    for (Index i = 0; i <= this -> num_types_; ++i)
    {
        histMag_x.at(i) = std::vector<Real>(0);
        histMag_y.at(i) = std::vector<Real>(0);
        histMag_z.at(i) = std::vector<Real>(0);
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

        for (Index i = 0; i <= this -> num_types_; ++i)
        {
            histMag_x.at(i).clear();
            histMag_y.at(i).clear();
            histMag_z.at(i).clear();
        }
        
        Real rejection;
        Real sigma_temp;
        for (Index _ = 0; _ < this -> mcs_; ++_)
        {
            this -> monteCarloStep(T, H);
            enes.push_back(this -> totalEnergy(H));
            this -> ComputeMagnetization();
            // auto mag = this -> magnetizationType_.at("magnetization");
            
            
            Index i = 0;
            for (auto& val : this -> counterRejections_)
            {
                rejection = val / Real(this -> lattice_.getSizesByIndex().at(i));
                sigma_temp = this -> sigma_.at(i) * (0.5 / rejection);
                if (sigma_temp > 60.0 || sigma_temp < 1e-10)
                {
                    sigma_temp = 60.0;
                }
                this -> sigma_.at(i) = sigma_temp;
                this -> counterRejections_.at(i) = 0;


                histMag_x.at(i).push_back(this -> magnetizationByTypeIndex_.at(i)[0]);
                histMag_y.at(i).push_back(this -> magnetizationByTypeIndex_.at(i)[1]);
                histMag_z.at(i).push_back(this -> magnetizationByTypeIndex_.at(i)[2]);
                i++;
            }

            histMag_x.at(this -> num_types_).push_back(this -> magnetizationByTypeIndex_.at(this -> num_types_)[0]);
            histMag_y.at(this -> num_types_).push_back(this -> magnetizationByTypeIndex_.at(this -> num_types_)[1]);
            histMag_z.at(this -> num_types_).push_back(this -> magnetizationByTypeIndex_.at(this -> num_types_)[2]);


            
        }
        this -> reporter_.partial_report(enes, histMag_x, histMag_y, histMag_z, this -> lattice_, index);


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
        // std::cout << "\t==>\tT = " << T << "; H = " << H << std::endl;
        std::cout << "\t==>\tT = " << T << "; H = " << H << " ";
        Index i = 0;
        for (auto& element : this -> lattice_.getMapTypeIndexes())
        {
            std::cout << element.first << " " << this -> sigma_.at(i) << " ";
            i++;
        }
        std::cout << std::endl;

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

void System::setState(std::string fileState)
{
    std::ifstream file(fileState);

    Array spin;
    std::string sx;
    std::string sy;
    std::string sz;
    for (auto& atom : this -> lattice_.getAtoms())
    {
        file >> sx >> sy >> sz;
        Array spin({atof(sx.c_str()), atof(sy.c_str()), atof(sz.c_str())});
        Real norm = std::round(std::sqrt((spin*spin).sum()) * 10000) / 10000;
        if (norm != atom.getSpinNorm())
        {
            std::cout << norm << " " << atom.getSpinNorm() << " "
                      << (norm == atom.getSpinNorm()) << " " << spin
                      << std::endl;
            EXIT("The spin norm of the site " + std::to_string(atom.getIndex()) + " does not match with the initial state given !!!");
        }

        atom.setSpin(spin);
    }
}

void System::setAnisotropies(std::vector<std::string> anisotropyfiles)
{
    for (auto& fileName : anisotropyfiles)
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