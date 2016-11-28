#ifndef SYSTEM
#define SYSTEM

#include <random>
#include <cmath>
#include <map>
#include "lattice.h"
#include "reporter.h"


class System
{
public:
    System(std::string fileName,
           std::string model,
           std::vector<Real> temps,
           std::vector<Real> fields,
           Index mcs,
           Index seed,
           std::string outName,
           Real Kb);
    ~System();

    Array magnetization();
    Real localEnergy(Index index, Real H);
    Real localEnergy(const Atom& atom, Real H);


    Real totalEnergy(Real H);
    
    void randomizeSpins(Real T);
    Array randomUnitArray();
    
    void monteCarloStep(Real T, Real H);

    void monteCarloStep_ising(Real T, Real H);
    
    void cycle_netcdf();

    Lattice& getLattice();

    Index getSeed() const;

    const std::map<std::string, Array>& getMagnetizationType() const;

private:
    Lattice lattice_;
    std::string model_;
    Index mcs_;
    Real Kb;
    Index seed_;
    std::vector<Real> temps_;
    std::vector<Real> fields_;
    std::string outName_;

    std::map<std::string, Array> magnetizationType_;

    std::mt19937_64 engine_;
    std::uniform_real_distribution<> realRandomGenerator_;
    std::uniform_int_distribution<> intRandomGenerator_;
    std::normal_distribution<> gaussianRandomGenerator_;

    Reporter reporter_;
};

#endif
