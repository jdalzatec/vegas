#include "atom.h"
#include <stdexcept>
#include "rlutil.h"


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

    this -> projections_ = std::vector<double>(0);
    this -> possibleProjections_ = std::vector<double>(0);
    for (double p = - this -> spinNorm_; p <= this -> spinNorm_; p += 1.0)
    {
        this -> projections_.push_back(p);
        this -> possibleProjections_.push_back(p);
    }

    this -> Sproj_ = 0;
    this -> setSpin({0.0, 0.0, this -> getPossibleProjections()[0]}); // ALWAYS THE INITIAL SPIN WILL BE IN THE Z-DIRECTION
    this -> removePossibleProjection(0);


    this -> oldSpin_ = this -> spin_;
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

const std::string& Atom::getTypeAnisotropy() const
{
    return this -> typeAnisotropy_;
}

void Atom::setTypeAnisotropy(const std::string& typeAnisotropy)
{
    this -> typeAnisotropy_ = typeAnisotropy;

    if (typeAnisotropy == "uniaxial")
    {
        this -> getAnisotropyEnergy = [](const Atom& atom){
            return - atom.getKan() * ((atom.getAnisotropyUnit() * atom.getSpin()).sum() * (atom.getAnisotropyUnit() * atom.getSpin()).sum());
        };
    }
    else if (typeAnisotropy == "cubic")
    {
        this -> getAnisotropyEnergy = [](const Atom& atom){
            double sx =  atom.getSpin()[0];
            double sy =  atom.getSpin()[1];
            double sz =  atom.getSpin()[2];
            return - atom.getKan() * (sx * sx * sy * sy + sy * sy * sz * sz + sx * sx * sz * sz);
        };
    }
    else
    {
        rlutil::setColor(rlutil::LIGHTRED);
        std::cout << "The anisotropy must be [uniaxial - cubic] !!!" << std::endl;
        std::cout << "Unsuccesful completion !!!" << std::endl;
        rlutil::resetColor();
        exit(EXIT_FAILURE);
    }

}

const std::string& Atom::getModel() const
{
    return this -> model_;
}

void Atom::setModel(const std::string& model)
{
    this -> model_ = model;

    if (model == "heisenberg")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator, Real KbT, Atom& atom)
        {
            atom.setOldSpin(atom.getSpin());
            Real phi = 2.0 * M_PI * realRandomGenerator(engine);
            Real theta = std::acos(2.0 * realRandomGenerator(engine) - 1.0);
            Array unitArray({std::sin(theta) * std::cos(phi), std::sin(theta) * std::sin(phi), std::cos(theta)});
            atom.setSpin( atom.getSpinNorm() * unitArray);
        };
    }
    else if (model == "ising")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator, Real KbT, Atom& atom)
        {
            atom.setOldSpin(atom.getSpin());
            atom.setSpin(  - atom.getSpin());
        };
    }
    else if (model == "qising")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator, Real KbT, Atom& atom)
        {
            atom.setOldSpin(atom.getSpin());
            atom.setSproj(int(realRandomGenerator(engine) * atom.getPossibleProjections().size()));
            atom.setSpin({0.0, 0.0, atom.getPossibleProjections()[atom.getSproj()]});
            atom.changeProjection(atom.getSproj(), atom.getOldSpin()[2]);
        };
    }
    else if (model == "cone")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator, Real KbT, Atom& atom)
        {
            atom.setOldSpin(atom.getSpin());
            Array gamma({gaussianRandomGenerator(engine), gaussianRandomGenerator(engine), gaussianRandomGenerator(engine)});
            Array spinUnit = atom.getSpin() / std::sqrt((atom.getSpin() * atom.getSpin()).sum());
            Real sigma = 0.353605133 * std::pow(KbT, 0.2); //muB en mev
            Array Sp = spinUnit + sigma * gamma;
            Sp /= std::sqrt((Sp * Sp).sum());
            Sp = atom.spinNorm_ * Sp;
            atom.setSpin(Sp);
        };
    }
    else if (model == "hinzke_nowak")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator, Real KbT, Atom& atom)
        {
            atom.setOldSpin(atom.getSpin());
            Index num = int(realRandomGenerator(engine) * 3);
            if (num == 0)
            {
                Array gamma({gaussianRandomGenerator(engine), gaussianRandomGenerator(engine), gaussianRandomGenerator(engine)});
                Array spinUnit = atom.getSpin() / std::sqrt((atom.getSpin() * atom.getSpin()).sum());
                Real sigma = 0.353605133 * std::pow(KbT, 0.2); //muB en mev
                Array Sp = spinUnit + sigma * gamma;
                Sp /= std::sqrt((Sp * Sp).sum());
                Sp = atom.spinNorm_ * Sp;
                atom.setSpin(Sp);
            }
            else if (num == 1)
            {
                atom.setSpin(  - atom.getSpin());
            }
            else if (num == 2)
            {
                Real phi = 2.0 * M_PI * realRandomGenerator(engine);
                Real theta = std::acos(2.0 * realRandomGenerator(engine) - 1.0);
                Array unitArray({std::sin(theta) * std::cos(phi), std::sin(theta) * std::sin(phi), std::cos(theta)});
                atom.setSpin( atom.getSpinNorm() * unitArray);
            }
        };
    }
}

Real Atom::getExchangeEnergy() const
{
    Real energy = 0.0;
    Index nbh_c = 0;
    for (auto&& nbh : this -> nbhs_)
        energy -= this -> exchanges_.at(nbh_c++) * (this -> spin_ * nbh -> getSpin()).sum();
    return energy;
}

Real Atom::getZeemanEnergy(Real& H) const
{
    return - H * (this -> getSpin() * this -> getExternalField()).sum();
}

void Atom::setOldSpin(const Array& oldSpin)
{
    this -> oldSpin_ = oldSpin;
}

const Index& Atom::getSproj() const
{
    return this -> Sproj_;
}

void Atom::setSproj(const Index& Sproj)
{
    this -> Sproj_ = Sproj;
}

const Array& Atom::getOldSpin() const
{
    return this -> oldSpin_;
}

void Atom::revertSpin()
{
    this -> changeProjection(this -> Sproj_, this -> spin_[2]);
    this -> spin_ = this -> oldSpin_;
}