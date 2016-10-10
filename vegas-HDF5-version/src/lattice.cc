#include "lattice.h"

#include <algorithm>
#include <random>
#include <cmath>
Lattice::Lattice(std::string fileName)
{
    std::ifstream file(fileName);

    Index num_ions;
    Index num_interactions;
    Index num_types;

    file >> num_ions >> num_interactions >> num_types;

    for (Index _ = 0; _ < num_types; ++_)
    {
        std::string general_type;
        Index num_type;
        file >> num_type >> general_type;
        this -> mapTypes_[general_type] = 0;
        this -> numType_[general_type] = num_type;
    }

    this -> atoms_ = std::vector<Atom>(num_ions);
    Real px;
    Real py;
    Real pz;
    Real spinNorm;
    Real ax;
    Real ay;
    Real az;
    Real Kan;
    Real hx;
    Real hy;
    Real hz;
    std::string type;
    std::string location;

    for (Index index = 0; index < num_ions; ++index)
    {
        file >> index >> px >> py >> pz >> spinNorm >> ax >> ay >> az >> Kan >> hx >> hy >> hz >> type >> location;

        Array position({px, py, pz});
        Array anisotropyUnit({ax, ay, az});

        Array spin({0.0, 0.0, spinNorm}); // ALWAYS THE INITIAL SPIN WILL BE IN THE Z-DIRECTION

        Atom atom(index, spin, position, anisotropyUnit);
        atom.setType(type);
        atom.setLocation(location);
        atom.setKan(Kan);
        atom.setExternalField({hx, hy, hz});
        this -> atoms_.at(index) = atom;

        this -> mapTypes_.at(type) += 1;
    }

    Index index;
    Index nbh;
    Real exchange;
    for (Index _ = 0; _ < num_interactions; ++_)
    {
        file >> index >> nbh >> exchange;
        this -> atoms_.at(index).addNbh(&this -> atoms_.at(nbh));
        this -> atoms_.at(index).addExchange(exchange);
    }


    for (auto&& atom : this -> atoms_)
    {
        std::string location = atom.getLocation();
        std::transform(location.begin(), location.end(), location.begin(), tolower);
        if (location == "surface")
        {
            this -> surfaceAtoms_.push_back(&atom);
            atom.isSurface(true);
        }
        else
        {
            this -> coreAtoms_.push_back(&atom);
            atom.isSurface(false);
        }
    }
}

Lattice::~Lattice()
{

}

std::vector<Atom>& Lattice::getAtoms()
{
    return this -> atoms_;
}

const std::map<std::string, Index>& Lattice::getMapTypes() const
{
    return this -> mapTypes_;
}

const std::map<std::string, Index>& Lattice::getNumType() const
{
    return this -> numType_;
}

const std::vector<Atom*>& Lattice::getSurfaceAtoms() const
{
    return this -> surfaceAtoms_;
}

const std::vector<Atom*>& Lattice::getCoreAtoms() const
{
    return this -> coreAtoms_;
}