#ifndef ATOM
#define ATOM

#include <string>
#include "params.h"

class Atom
{
public:
    Atom();
    Atom(Index index);
    Atom(Index index, Array spin);
    Atom(Index index, Array spin, Array position, Array anisotropy);
    Atom(Index index, Array spin, std::vector<Atom*> nbhs,
         std::vector<Real> exchanges);
    Atom(Index index, Array spin, std::vector<Atom*> nbhs,
         std::vector<Real> exchanges, Array position, Array anisotropy);
    ~Atom();


    const Array& getPosition() const;
    const Index& getIndex() const;
    const std::vector<Atom*>& getNbhs() const;
    const Real& getSpinNorm() const;
    const Array& getSpin() const;
    const Array& getAnisotropyUnit() const;
    const std::vector<Real>& getExchanges() const;
    const std::string& getType() const;
    const std::string& getLocation() const;
    const Real& getKan() const;
    const Array& getExternalField() const;

    const std::vector<double>& getProjections() const;
    const std::vector<double>& getPossibleProjections() const;
    
    void setPosition(const Array& position);
    void setNbhs(const std::vector<Atom*>& nbhs);
    void setExchanges(const std::vector<Real>& exchanges);
    void setType(const std::string& type);
    void setLocation(const std::string& location);
    void setSpin(const Array& spin);
    void setAnisotropyUnit(const Array& anistropyUnit);
    void setExternalField(const Array& externalField);
    void setKan(const Real& Kan);
    void addNbh(Atom* nbh);
    void addExchange(Real exchange);
    
    bool isSurface() const;
    void isSurface(bool is_surface);
    void changeProjection(Index i, Real value);
    void removePossibleProjection(Index i);

private:
    Array position_;
    Index index_;
    std::vector<Atom*> nbhs_;
    Real spinNorm_;
    Array spin_;
    Array anisotropyUnit_;
    Array externalField_;
    Real Kan_;
    std::string type_;
    std::string location_;
    std::vector<Real> exchanges_;
    std::vector<double> projections_;
    std::vector<double> possibleProjections_;
    bool is_surface_;
};


#endif