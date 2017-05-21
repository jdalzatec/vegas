#ifndef REPORTER
#define REPORTER

#include "config.h"
#include "params.h"
#include "lattice.h"

#include <string>
#include <vector>
#include <map>

class Reporter
{
public:
    Reporter();
    Reporter(std::string filename,
             std::map<std::string, Array> magnetizationTypes,
             Lattice& lattice,
             const std::vector<Real>& temps,
             const std::vector<Real>& fields,
             Index mcs,
             Index seed,
             Real kB);

    void partial_report(const std::vector<Real>& enes, const std::map<std::string, std::vector<Real> >& histMag, Lattice& lattice, Index index);
    void close();
    ~Reporter();
    
private:
    hid_t       file, space, filetype, memtype;
    hid_t       dataspace_id_energy, memspace_id_;
    hid_t       memspace_id_mag;
    herr_t      status;
    
    std::map<std::string, hid_t> mags_dset;
    std::map<std::string, hid_t> dataspace_id_mag;
    hid_t energies_dset;
    hid_t temps_dset;
    hid_t fields_dset;

    hid_t position_dset;
    hid_t types_dset;
    hid_t finalstates_dset;

    hsize_t     count_[2];              /* size of subset in the file */
    hsize_t     start_[2];             /* subset offset in the file */
    hsize_t     stride_[2];
    hsize_t     block_[2];

    hsize_t     dims_select_[1];



    hid_t       memspace_id_finalstates, dataspace_id_finalstates;
    hsize_t     count_finalstates[3];              /* size of subset in the file */
    hsize_t     start_finalstates[3];             /* subset offset in the file */
    hsize_t     stride_finalstates[3];
    hsize_t     block_finalstates[3];

    hsize_t     dims_select_finalstates[1];



};

#endif