#include "../include/lattice.h"

#include <algorithm>


Lattice::Lattice(std::string fileName)
{
    std::ifstream file(fileName);

    Index num_ions;
    Index num_interactions;
    Index num_types;

    file >> num_ions >> num_interactions >> num_types;

    for (Index i = 0; i < num_types; ++i)
    {
        std::string type;
        file >> type;
        this -> mapTypeIndexes_[type] = i;
        this -> mapIndexTypes_[i] = type;
    }

    this -> sizesByIndex_ = std::vector<Index>(num_types);

    this -> atoms_ = std::vector<Atom>(num_ions);
    Real px;
    Real py;
    Real pz;
    Real spinNorm;
    Real hx;
    Real hy;
    Real hz;
    std::string type;
    std::string model;

    for (Index index = 0; index < num_ions; ++index)
    {
        file >> index >> px >> py >> pz >> spinNorm >> hx >> hy >> hz >> type >> model;

        Array position({px, py, pz});

        Array spin({0.0, 0.0, spinNorm}); // ALWAYS THE INITIAL SPIN WILL BE IN THE Z-DIRECTION

        std::transform(model.begin(), model.end(), model.begin(), tolower);

        Atom atom(index, spin, position);
        atom.setType(type);
        atom.setExternalField({hx, hy, hz});
        atom.setModel(model);
        atom.setTypeIndex(this -> mapTypeIndexes_.at(type));

        this -> atoms_.at(index) = atom;


        this -> sizesByIndex_.at(this -> mapTypeIndexes_.at(type)) += 1;
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

}

Lattice::~Lattice()
{

}

std::vector<Atom>& Lattice::getAtoms()
{
    return this -> atoms_;
}

const std::map<std::string, Index>& Lattice::getMapTypeIndexes() const
{
    return this -> mapTypeIndexes_;
}

const std::map<Index, std::string>& Lattice::getMapIndexTypes() const
{
    return this -> mapIndexTypes_;
}

const std::vector<Index>& Lattice::getSizesByIndex() const
{
    return this -> sizesByIndex_;
}
