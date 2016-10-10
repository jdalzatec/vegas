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
           std::string outName);
    ~System();

    Array magnetization();
    Real localEnergy_ani_uniaxial(Index index, Real H);
    Real localEnergy_ani_uniaxial(const Atom& atom, Real H);

    Real localEnergy_ani_cubic(Index index, Real H);
    Real localEnergy_ani_cubic(const Atom& atom, Real H);

    Real totalEnergy_ani_uniaxial(Real H);
    Real totalEnergy_ani_cubic(Real H);
    
    void randomizeSpins();
    Array randomUnitArray();
    
    void monteCarloStep_ani_uniaxial(Real T, Real H);
    void monteCarloStep_ani_cubic(Real T, Real H);

    void monteCarloStep_ani_uniaxial_ising(Real T, Real H);
    
    void cycle_netcdf_ani_uniaxial();
    void cycle_netcdf_ani_cubic();

    Lattice& getLattice();

    Index getSeed() const;

    const std::map<std::string, Array>& getMagnetizationType() const;

private:
    Lattice lattice_;
    std::string model_;
    Index mcs_;
    Index seed_;
    std::vector<Real> temps_;
    std::vector<Real> fields_;
    std::string outName_;

    std::map<std::string, Array> magnetizationType_;

    std::mt19937_64 engine_;
    std::uniform_real_distribution<> realRandomGenerator_;
    std::uniform_int_distribution<> intRandomGenerator_;

    Reporter reporter_;
};

#endif
