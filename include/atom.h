#ifndef ATOM_H
#define ATOM_H

#include "params.h"

#include <string>
#include <functional>
#include <random>

class Atom
{
public:
    Atom();
    Atom(Index index, Array spin, Array position);
    ~Atom();


    const Array& getPosition() const;
    const Index& getIndex() const;
    const std::vector<Atom*>& getNbhs() const;
    const Real& getSpinNorm() const;
    const Array& getSpin() const;
    const Array& getOldSpin() const;
    const Array& getAnisotropyUnit() const;
    const std::vector<Real>& getExchanges() const;
    const std::string& getType() const;
    const std::string& getTypeAnisotropy() const;
    const Real& getKan() const;
    const Array& getExternalField() const;
    const Index& getSproj() const;
    const Index& getTypeIndex() const;

    const std::vector<double>& getProjections() const;
    const std::vector<double>& getPossibleProjections() const;

    const std::string& getModel() const;
    void setModel(const std::string& model);


    void setPosition(const Array& position);
    void setNbhs(const std::vector<Atom*>& nbhs);
    void setExchanges(const std::vector<Real>& exchanges);
    void setType(const std::string& type);
    void setSpin(const Array& spin);
    void setOldSpin(const Array& oldSpin);
    void setExternalField(const Array& externalField);
    void setSproj(const Index& Sproj);
    void setTypeIndex(const Index& typeIndex);

    void addNbh(Atom* nbh);
    void addExchange(Real exchange);

    void changeProjection(Index i, Real value);
    void removePossibleProjection(Index i);


    Real getExchangeEnergy() const;
    Real getZeemanEnergy(const Real& H) const;
    Real getAnisotropyEnergy(const Atom& atom) const;

    std::function<void(
        std::mt19937_64& engine,
        std::uniform_real_distribution<>& realRandomGenerator,
        std::normal_distribution<>& gaussianRandomGenerator,
        Real sigma_, Atom& atom, Index num)> randomizeSpin;


    std::function<void(
        std::mt19937_64& engine,
        std::uniform_real_distribution<>& realRandomGenerator,
        std::normal_distribution<>& gaussianRandomGenerator,
        Atom& atom)> randomInitialState;

    void revertSpin();


    void addAnisotropyTerm(const std::function<Real(const Atom&)>& func);
private:
    Array position_;
    Index index_;
    std::vector<Atom*> nbhs_;
    Real spinNorm_;
    Array spin_;
    Array oldSpin_;
    Array externalField_;

    std::string type_;
    Index typeIndex_;
    std::vector<Real> exchanges_;
    std::vector<double> projections_;
    std::vector<double> possibleProjections_;

    std::string model_;

    Index Sproj_;

    std::vector< std::function<Real(const Atom&)> > anisotropyTerms_;
};

#endif // ATOM_H
