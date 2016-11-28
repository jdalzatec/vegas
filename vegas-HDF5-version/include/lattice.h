#ifndef LATTICE
#define LATTICE

#include <vector>
#include <fstream>
#include <map>

#include "atom.h"

class Lattice
{
public:
    Lattice(std::string fileName);
    ~Lattice();

    std::vector<Atom>& getAtoms();

    const std::map<std::string, Index>& getMapTypes() const;
    const std::map<std::string, Index>& getNumType() const;
    const std::vector<Atom*>& getSurfaceAtoms() const;
    const std::vector<Atom*>& getCoreAtoms() const;

private:
    std::vector<Atom> atoms_;
    std::map<std::string, Index> mapTypes_;
    std::map<std::string, Index> numType_;
    std::vector<Atom*> surfaceAtoms_;
    std::vector<Atom*> coreAtoms_;

};

#endif