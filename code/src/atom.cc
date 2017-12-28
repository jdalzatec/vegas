#include "atom.h"
#include <stdexcept>
#include "rlutil.h"

Real dot(const Array& A, const Array& B)
{
    return (A * B).sum();
}

Array cross(const Array& A, const Array& B)
{
    return Array{A[1]*B[2] - A[2]*B[1], A[2]*B[0] - A[0]*B[2], A[0]*B[1] - A[1]*B[0]};
}

Real norm(const Array& A)
{
    return std::sqrt((A*A).sum());
}


Atom::Atom() : Atom(0, ZERO, ZERO)
{

}

Atom::Atom(Index index, Array spin, Array position)
{

    this -> index_ = index;
    this -> spin_ = spin;
    this -> nbhs_ = std::vector<Atom*>();
    this -> exchanges_ = std::vector<Real>();
    this -> position_ = position;
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

const std::vector<Real>& Atom::getExchanges() const
{
    return this -> exchanges_;
}

const std::string& Atom::getType() const
{
    return this -> type_;
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

void Atom::setExchanges(const std::vector<Real>& exchanges)
{
    this -> exchanges_ = exchanges;
}

void Atom::setType(const std::string& type)
{
    this -> type_ = type;
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


const std::string& Atom::getModel() const
{
    return this -> model_;
}

void Atom::setModel(const std::string& model)
{
    this -> model_ = model;

    if (model == "random")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator,
            Real sigma_,
            Atom& atom, Index num)
        {
            atom.setOldSpin(atom.getSpin());
            Array gamma({gaussianRandomGenerator(engine), gaussianRandomGenerator(engine), gaussianRandomGenerator(engine)});
            Array unitArray = gamma / std::sqrt((gamma * gamma).sum());
            atom.setSpin( atom.getSpinNorm() * unitArray);
        };
    }
    else if (model == "flip")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator,
            Real sigma_,
            Atom& atom, Index num)
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
            std::normal_distribution<>& gaussianRandomGenerator,
            Real sigma_,
            Atom& atom, Index num)
        {
            atom.setOldSpin(atom.getSpin());
            atom.setSproj(int(realRandomGenerator(engine) * atom.getPossibleProjections().size()));
            atom.setSpin({0.0, 0.0, atom.getPossibleProjections()[atom.getSproj()]});
            atom.changeProjection(atom.getSproj(), atom.getOldSpin()[2]);
        };
    }
    else if (model == "adaptive")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator,
            Real sigma_,
            Atom& atom, Index num)
        {
            atom.setOldSpin(atom.getSpin());
            Array gamma({gaussianRandomGenerator(engine), gaussianRandomGenerator(engine), gaussianRandomGenerator(engine)});
            Array spinUnit = atom.getSpin() / std::sqrt((atom.getSpin() * atom.getSpin()).sum());
            Array Sp = spinUnit + sigma_ * gamma;
            Sp /= std::sqrt((Sp * Sp).sum());
            Sp = atom.getSpinNorm() * Sp;
            atom.setSpin(Sp);
        };
    }
    else if (model == "cone30")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator,
            Real sigma_,
            Atom& atom, Index num)
        {
            Real A = M_PI / 6.0;
            Real cos_theta = (1.0 - std::cos(A)) * realRandomGenerator(engine) + std::cos(A);
            Real theta_rot = std::acos(cos_theta);

            Array vector = atom.getSpin() / norm(atom.getSpin());
            Real x = vector[0];
            Real y = vector[1];
            Real z = vector[2];
            Real theta_vector = std::acos(z);
            Real phi_vector = std::atan2(y, x);

            Real phi_rot = 2.0 * M_PI * realRandomGenerator(engine);
            Real theta_new = theta_vector - theta_rot;
            Real xn = std::sin(theta_new) * std::cos(phi_vector);
            Real yn = std::sin(theta_new) * std::sin(phi_vector);
            Real zn = std::cos(theta_new);
            Array new_vector = {xn, yn, zn};
            Array v_rot = new_vector*std::cos(phi_rot) + cross(vector, new_vector)*std::sin(phi_rot) + vector*dot(vector, new_vector)*(1-std::cos(phi_rot));
    
            atom.setOldSpin(atom.getSpin());
            Array Sp = atom.getSpinNorm() * v_rot / std::sqrt((v_rot * v_rot).sum());
            atom.setSpin(Sp);
        };
    }
    else if (model == "cone15")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator,
            Real sigma_,
            Atom& atom, Index num)
        {
            Real A = M_PI / 12.0;
            Real cos_theta = (1.0 - std::cos(A)) * realRandomGenerator(engine) + std::cos(A);
            Real theta_rot = std::acos(cos_theta);

            Array vector = atom.getSpin() / norm(atom.getSpin());
            Real x = vector[0];
            Real y = vector[1];
            Real z = vector[2];
            Real theta_vector = std::acos(z);
            Real phi_vector = std::atan2(y, x);

            Real phi_rot = 2.0 * M_PI * realRandomGenerator(engine);
            Real theta_new = theta_vector - theta_rot;
            Real xn = std::sin(theta_new) * std::cos(phi_vector);
            Real yn = std::sin(theta_new) * std::sin(phi_vector);
            Real zn = std::cos(theta_new);
            Array new_vector = {xn, yn, zn};
            Array v_rot = new_vector*std::cos(phi_rot) + cross(vector, new_vector)*std::sin(phi_rot) + vector*dot(vector, new_vector)*(1-std::cos(phi_rot));
    
            atom.setOldSpin(atom.getSpin());
            Array Sp = atom.getSpinNorm() * v_rot / std::sqrt((v_rot * v_rot).sum());
            atom.setSpin(Sp);
        };
    }
    else if (model == "hn30")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator,
            Real sigma_,
            Atom& atom, Index num)
        {
            atom.setOldSpin(atom.getSpin());
            if (num == 0)
            {
                Real A = M_PI / 6.0;
                Real cos_theta = (1.0 - std::cos(A)) * realRandomGenerator(engine) + std::cos(A);
                // Real cos_theta = 2*realRandomGenerator(engine) - 1;
                Real theta_rot = std::acos(cos_theta);

                Array vector = atom.getSpin() / norm(atom.getSpin());
                Real x = vector[0];
                Real y = vector[1];
                Real z = vector[2];
                Real theta_vector = std::acos(z);
                Real phi_vector = std::atan2(y, x);

                Real phi_rot = 2.0 * M_PI * realRandomGenerator(engine);
                Real theta_new = theta_vector - theta_rot;
                Real xn = std::sin(theta_new) * std::cos(phi_vector);
                Real yn = std::sin(theta_new) * std::sin(phi_vector);
                Real zn = std::cos(theta_new);
                Array new_vector = {xn, yn, zn};
                Array v_rot = new_vector*std::cos(phi_rot) + cross(vector, new_vector)*std::sin(phi_rot) + vector*dot(vector, new_vector)*(1-std::cos(phi_rot));
        
                atom.setOldSpin(atom.getSpin());
                Array Sp = atom.getSpinNorm() * v_rot / std::sqrt((v_rot * v_rot).sum());
                atom.setSpin(Sp);
            }
            else if (num == 1)
            {
                Array gamma({gaussianRandomGenerator(engine), gaussianRandomGenerator(engine), gaussianRandomGenerator(engine)});
                Array unitArray = gamma / std::sqrt((gamma * gamma).sum());
                atom.setSpin( atom.getSpinNorm() * unitArray);
            }
            else if (num == 2)
            {
                atom.setSpin(  - atom.getSpin());
            }
        };
    }
    else if (model == "hn15")
    {
        this -> randomizeSpin = [](
            std::mt19937_64& engine,
            std::uniform_real_distribution<>& realRandomGenerator,
            std::normal_distribution<>& gaussianRandomGenerator,
            Real sigma_,
            Atom& atom, Index num)
        {
            atom.setOldSpin(atom.getSpin());
            if (num == 0)
            {
                Real A = M_PI / 12.0;
                Real cos_theta = (1.0 - std::cos(A)) * realRandomGenerator(engine) + std::cos(A);
                // Real cos_theta = 2*realRandomGenerator(engine) - 1;
                Real theta_rot = std::acos(cos_theta);

                Array vector = atom.getSpin() / norm(atom.getSpin());
                Real x = vector[0];
                Real y = vector[1];
                Real z = vector[2];
                Real theta_vector = std::acos(z);
                Real phi_vector = std::atan2(y, x);

                Real phi_rot = 2.0 * M_PI * realRandomGenerator(engine);
                Real theta_new = theta_vector - theta_rot;
                Real xn = std::sin(theta_new) * std::cos(phi_vector);
                Real yn = std::sin(theta_new) * std::sin(phi_vector);
                Real zn = std::cos(theta_new);
                Array new_vector = {xn, yn, zn};
                Array v_rot = new_vector*std::cos(phi_rot) + cross(vector, new_vector)*std::sin(phi_rot) + vector*dot(vector, new_vector)*(1-std::cos(phi_rot));
        
                atom.setOldSpin(atom.getSpin());
                Array Sp = atom.getSpinNorm() * v_rot / std::sqrt((v_rot * v_rot).sum());
                atom.setSpin(Sp);
            }
            else if (num == 1)
            {
                Array gamma({gaussianRandomGenerator(engine), gaussianRandomGenerator(engine), gaussianRandomGenerator(engine)});
                Array unitArray = gamma / std::sqrt((gamma * gamma).sum());
                atom.setSpin( atom.getSpinNorm() * unitArray);
            }
            else if (num == 2)
            {
                atom.setSpin(  - atom.getSpin());
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

Real Atom::getZeemanEnergy(const Real& H) const
{
    return - H * (this -> getSpin() * this -> getExternalField()).sum();
}

Real Atom::getAnisotropyEnergy(const Atom& atom) const
{
    Real anisotropyEnergy = 0.0;
    for (auto&& func : this -> anisotropyTerms_)
        anisotropyEnergy += func(atom);
    return anisotropyEnergy;
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

void Atom::addAnisotropyTerm(const std::function<Real(const Atom&)>& func)
{
    this -> anisotropyTerms_.push_back(func);
}

const Index& Atom::getTypeIndex() const
{
    return this -> typeIndex_;
}

void Atom::setTypeIndex(const Index& typeIndex)
{
    this -> typeIndex_ = typeIndex;
}


