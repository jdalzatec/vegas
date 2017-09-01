#ifndef ATOM
#define ATOM

#include <string>
#include <functional>
#include <random>
#include "params.h"

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

    void addNbh(Atom* nbh);
    void addExchange(Real exchange);
    
    void changeProjection(Index i, Real value);
    void removePossibleProjection(Index i);


    Real getExchangeEnergy() const;
    Real getAnisotropyEnergy() const;
    Real getZeemanEnergy(Real& H) const;

    std::function<void(
        std::mt19937_64& engine,
        std::uniform_real_distribution<>& realRandomGenerator,
        std::normal_distribution<>& gaussianRandomGenerator, Real kbT, Atom& atom)> randomizeSpin;


    void revertSpin();


    void addAnisotropyAxis(const Array& axis, const Real& kan);
private:
    Array position_;
    Index index_;
    std::vector<Atom*> nbhs_;
    Real spinNorm_;
    Array spin_;
    Array oldSpin_;
    Array externalField_;

    std::vector<Array> anisotropyAxis_;
    std::vector<Real> kan_;

    std::string type_;
    std::vector<Real> exchanges_;
    std::vector<double> projections_;
    std::vector<double> possibleProjections_;
    
    std::string model_;

    Index Sproj_;

};


#endif