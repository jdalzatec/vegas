#ifndef PARAMS
#define PARAMS

#include <valarray>
#include <string>

typedef double Real;
typedef std::valarray<Real> Array;
typedef unsigned int Index;
const Array ZERO = {0.0, 0.0, 0.0};
const Index AMOUNTCHUNKS = 5;

template <typename T>
std::ostream & operator << (std::ostream &o, std::valarray<T> val)
{
    for (Index i = 0; i < val.size(); ++i)
    {
        o << val[i] << "\t";
    }
    return o;
}

#endif