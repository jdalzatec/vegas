#ifndef SYSTEM
#define SYSTEM

#include <random>
#include <cmath>
#include "lattice.h"
#include "reporter.h"


class System
{
public:
    System(std::string fileName,
           std::vector<Real> temps,
           std::vector<Real> fields,
           Index mcs,
           Index seed,
           std::string outName,
           Real kb);
    ~System();

    void ComputeMagnetization();
    Real localEnergy(Index index, Real H);
    Real localEnergy(const Atom& atom, Real H);


    Real totalEnergy(Real H);
    
    void randomizeSpins();
    
    void monteCarloStep(Real T, Real H);

    void monteCarloStep_ising(Real T, Real H);
    
    void cycle();

    Lattice& getLattice();

    Index getSeed() const;

    const std::map<std::string, Array>& getMagnetizationType() const;

    void setState(std::string fileState);

    void setAnisotropies(std::vector<std::string> anisotropyfiles);

private:
    Lattice lattice_;
    Index mcs_;
    Real kb_;
    Index seed_;
    std::vector<Real> temps_;
    std::vector<Real> fields_;
    std::string outName_;

    std::vector<Array> magnetizationByTypeIndex_;

    std::mt19937_64 engine_;
    std::uniform_real_distribution<> realRandomGenerator_;
    std::uniform_int_distribution<> intRandomGenerator_;
    std::normal_distribution<> gaussianRandomGenerator_;

    Reporter reporter_;

    std::vector<Real> sigma_;
    std::vector<Index> counterRejections_;

    Index num_types_;
};

#endif
