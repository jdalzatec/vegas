#include "atom.h"
#include <stdexcept>

Atom::Atom() : Atom(0, ZERO, std::vector<Atom*>(), std::vector<Real>(), ZERO, ZERO)
{

}

Atom::Atom(Index index) : Atom(index, ZERO, std::vector<Atom*>(), std::vector<Real>(), ZERO, ZERO)
{

}

Atom::Atom(Index index, Array spin) 
        : Atom(index, spin, std::vector<Atom*>(), std::vector<Real>(), ZERO, ZERO)
{

}

Atom::Atom(Index index, Array spin,
           Array position, Array anisotropy) : Atom(index, spin,
           std::vector<Atom*>(), std::vector<Real>(), position, anisotropy)
{

}

Atom::Atom(Index index, Array spin, std::vector<Atom*> nbhs,
           std::vector<Real> exchanges) 
        : Atom(index, spin, nbhs, exchanges, ZERO, ZERO)
{

}

Atom::Atom(Index index, Array spin, std::vector<Atom*> nbhs,
           std::vector<Real> exchanges,
           Array position, Array anisotropy)
{

    if (nbhs.size() != exchanges.size())
        throw std::length_error("The exchanges and neighbors dont have the same length !!!");

    this -> index_ = index;
    this -> spin_ = spin;
    this -> nbhs_ = nbhs;
    this -> exchanges_ = exchanges;
    this -> position_ = position;
    this -> anisotropyUnit_ = anisotropy;
    this -> Kan_ = 0.0;
    this -> spinNorm_ = sqrt((this -> spin_ * this -> spin_).sum());
    this -> type_ = "nothing";
    this -> is_surface_ = false;

    this -> projections_ = std::vector<double>(0);
    this -> possibleProjections_ = std::vector<double>(0);
    for (double p = - this -> spinNorm_; p <= this -> spinNorm_; p += 1.0)
    {
        this -> projections_.push_back(p);
        this -> possibleProjections_.push_back(p);
    }

}

Atom::~Atom()
{

}

const Array& Atom::getPosition() const
{
    return this -> position_;
}

const Index& Atom::getIndex() const
{
    return this -> index_;
}

const std::vector<Atom*>& Atom::getNbhs() const
{
    return this -> nbhs_;
}

const Real& Atom::getSpinNorm() const
{
    return this -> spinNorm_;
}

const Array& Atom::getSpin() const
{
    return this -> spin_;
}

const Array& Atom::getAnisotropyUnit() const
{
    return this -> anisotropyUnit_;
}

const std::vector<Real>& Atom::getExchanges() const
{
    return this -> exchanges_;
}

const std::string& Atom::getType() const
{
    return this -> type_;
}

const std::string& Atom::getLocation() const
{
    return this -> location_;
}

const Real& Atom::getKan() const
{
    return this -> Kan_;
}

const std::vector<double>& Atom::getProjections() const
{
    return this -> projections_;
}

const std::vector<double>& Atom::getPossibleProjections() const
{
    return this -> possibleProjections_;
}

const Array& Atom::getExternalField() const
{
    return this -> externalField_;
}

void Atom::setPosition(const Array& position)
{
    this -> position_ = position;
}

void Atom::setNbhs(const std::vector<Atom*>& nbhs)
{
    this -> nbhs_ = nbhs;
}

void Atom::setSpin(const Array& spin)
{
    this -> spin_ = spin;
    // this -> spinNorm_ = sqrt((this -> spin_ * this -> spin_).sum());
}

void Atom::setAnisotropyUnit(const Array& anisotropyUnit)
{
    this -> anisotropyUnit_ = anisotropyUnit;
}

void Atom::setExchanges(const std::vector<Real>& exchanges)
{
    this -> exchanges_ = exchanges;
}

void Atom::setType(const std::string& type)
{
    this -> type_ = type;
}

void Atom::setLocation(const std::string& location)
{
    this -> location_ = location;
}

void Atom::setKan(const Real& Kan)
{
    this -> Kan_ = Kan;
}

void Atom::addNbh(Atom* nbh)
{
    this -> nbhs_.push_back(nbh);
}

void Atom::addExchange(Real exchange)
{
    this -> exchanges_.push_back(exchange);
}

bool Atom::isSurface() const
{
    return this -> is_surface_;
}

void Atom::isSurface(bool is_surface)
{
    this -> is_surface_ = is_surface;
}

void Atom::setExternalField(const Array& externalField)
{
    this -> externalField_ = externalField;
}

void Atom::changeProjection(Index i, Real value)
{
    this -> possibleProjections_.at(i) = value;
}

void Atom::removePossibleProjection(Index i)
{
    this -> possibleProjections_.erase(this -> possibleProjections_.begin() + i);
}