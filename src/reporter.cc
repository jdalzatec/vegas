#include "../include/reporter.h"

Reporter::Reporter()
{

}

Reporter::Reporter(std::string filename,
             std::vector<Array> magnetizationTypes,
             Lattice& lattice,
             const std::vector<Real>& temps,
             const std::vector<Real>& fields,
             Index mcs,
             Index seed,
             Real kb)
{
    this -> file =  H5Fcreate(filename.c_str(), H5F_ACC_TRUNC, H5P_DEFAULT, H5P_DEFAULT);

    hid_t space, dcpl;
    hsize_t dims[2] = {temps.size(), mcs};
    space = H5Screate_simple(2, dims, NULL);
    dcpl = H5Pcreate(H5P_DATASET_CREATE);

    hsize_t CHUNK[2] = {1, Index(mcs / AMOUNTCHUNKS)};

    this -> status = H5Pset_deflate(dcpl, 1);
    this -> status = H5Pset_chunk(dcpl, 2, CHUNK);

    Index num_types = lattice.getMapTypeIndexes().size();
    this -> mags_dset_x_ = std::vector<hid_t>(num_types + 1);
    this -> dataspace_id_mag_x_ = std::vector<hid_t>(num_types + 1);
    this -> mags_dset_y_ = std::vector<hid_t>(num_types + 1);
    this -> dataspace_id_mag_y_ = std::vector<hid_t>(num_types + 1);
    this -> mags_dset_z_ = std::vector<hid_t>(num_types + 1);
    this -> dataspace_id_mag_z_ = std::vector<hid_t>(num_types + 1);

    for (auto& type : lattice.getMapTypeIndexes())
    {
        this -> mags_dset_x_.at(type.second) = H5Dcreate(file, (type.first + "_x").c_str(),
                    H5T_IEEE_F64LE, space, H5P_DEFAULT,
                    dcpl, H5P_DEFAULT);

        this -> mags_dset_y_.at(type.second) = H5Dcreate(file, (type.first + "_y").c_str(),
                    H5T_IEEE_F64LE, space, H5P_DEFAULT,
                    dcpl, H5P_DEFAULT);

        this -> mags_dset_z_.at(type.second) = H5Dcreate(file, (type.first + "_z").c_str(),
                    H5T_IEEE_F64LE, space, H5P_DEFAULT,
                    dcpl, H5P_DEFAULT);
    }

    this -> mags_dset_x_.at(num_types) = H5Dcreate(file, "magnetization_x",
                H5T_IEEE_F64LE, space, H5P_DEFAULT,
                dcpl, H5P_DEFAULT);

    this -> mags_dset_y_.at(num_types) = H5Dcreate(file, "magnetization_y",
                H5T_IEEE_F64LE, space, H5P_DEFAULT,
                dcpl, H5P_DEFAULT);

    this -> mags_dset_z_.at(num_types) = H5Dcreate(file, "magnetization_z",
                H5T_IEEE_F64LE, space, H5P_DEFAULT,
                dcpl, H5P_DEFAULT);

    this -> energies_dset = H5Dcreate(file, "energy",
                H5T_IEEE_F64LE, space, H5P_DEFAULT,
                dcpl, H5P_DEFAULT);


    hsize_t dims_temps[1] = {temps.size()};
    space = H5Screate_simple(1, dims_temps, NULL);
    this -> temps_dset = H5Dcreate(file, "temperature",
                H5T_IEEE_F64LE, space, H5P_DEFAULT,
                H5P_DEFAULT, H5P_DEFAULT);

    hsize_t dims_fields[1] = {fields.size()};
    space = H5Screate_simple(1, dims_fields, NULL);
    this -> fields_dset = H5Dcreate(file, "field",
                H5T_IEEE_F64LE, space, H5P_DEFAULT,
                H5P_DEFAULT, H5P_DEFAULT);

    hsize_t dims_pos[2] = {lattice.getAtoms().size(), 3};
    space = H5Screate_simple(2, dims_pos, NULL);
    this -> position_dset = H5Dcreate(file, "positions",
                H5T_IEEE_F64LE, space, H5P_DEFAULT,
                H5P_DEFAULT, H5P_DEFAULT);


    hid_t filetype = H5Tcopy(H5T_C_S1);
    this -> status = H5Tset_size(filetype, H5T_VARIABLE);
    hid_t memtype = H5Tcopy(H5T_C_S1);
    this -> status = H5Tset_size(memtype, H5T_VARIABLE);
    hsize_t dims_types[1] = {lattice.getAtoms().size()};
    space = H5Screate_simple(1, dims_types, NULL);
    this -> types_dset = H5Dcreate(file, "types",
                filetype, space, H5P_DEFAULT,
                H5P_DEFAULT, H5P_DEFAULT);


    hsize_t dims_finaltates[3] = {temps.size(), lattice.getAtoms().size(), 3};
    space = H5Screate_simple(3, dims_finaltates, NULL);
    this -> finalstates_dset = H5Dcreate(file, "finalstates",
                H5T_IEEE_F64LE, space, H5P_DEFAULT,
                H5P_DEFAULT, H5P_DEFAULT);


    double positions[lattice.getAtoms().size()][3];
    const char *types[lattice.getAtoms().size()];
    int i = 0;
    for(auto& atom : lattice.getAtoms())
    {
        std::copy(std::begin(atom.getPosition()), std::end(atom.getPosition()), positions[i]);
        types[i] = atom.getType().c_str();
        i++;
    }

    this -> status = H5Dwrite(types_dset, memtype, H5S_ALL, H5S_ALL, H5P_DEFAULT, types);
    this -> status = H5Dwrite(position_dset, H5T_NATIVE_DOUBLE, H5S_ALL, H5S_ALL, H5P_DEFAULT, positions);
    this -> status = H5Dwrite(temps_dset, H5T_NATIVE_DOUBLE, H5S_ALL, H5S_ALL, H5P_DEFAULT, temps.data());
    this -> status = H5Dwrite(fields_dset, H5T_NATIVE_DOUBLE, H5S_ALL, H5S_ALL, H5P_DEFAULT, fields.data());

    this -> dims_select_[0] = mcs;
    this -> memspace_id_ = H5Screate_simple(1, this -> dims_select_, NULL);
    this -> dataspace_id_energy = H5Dget_space(this -> energies_dset);

    this -> start_[1] = 0;

    this -> count_[0] = 1;
    this -> count_[1] = mcs;

    this -> stride_[0] = 1;
    this -> stride_[1] = 1;

    this -> block_[0] = 1;
    this -> block_[1] = 1;


    for (Index i = 0; i <= num_types; ++i)
    {
        this -> dataspace_id_mag_x_.at(i) = H5Dget_space(mags_dset_x_.at(i));
        this -> dataspace_id_mag_y_.at(i) = H5Dget_space(mags_dset_y_.at(i));
        this -> dataspace_id_mag_z_.at(i) = H5Dget_space(mags_dset_z_.at(i));
    }


    this -> dims_select_finalstates[0] = 3;
    this -> memspace_id_finalstates = H5Screate_simple(1, this -> dims_select_finalstates, NULL);
    this -> dataspace_id_finalstates = H5Dget_space(this -> finalstates_dset);

    this -> start_finalstates[2] = 0;

    this -> count_finalstates[0] = 1;
    this -> count_finalstates[1] = 1;
    this -> count_finalstates[2] = 3;

    this -> stride_finalstates[0] = 1;
    this -> stride_finalstates[1] = 1;
    this -> stride_finalstates[2] = 1;

    this -> block_finalstates[0] = 1;
    this -> block_finalstates[1] = 1;
    this -> block_finalstates[2] = 1;

    this -> status = H5Pclose(dcpl);
    this -> status = H5Sclose(space);

    hid_t aid2 = H5Screate(H5S_SCALAR);
    hid_t attr_mcs = H5Acreate(file, "mcs", H5T_NATIVE_INT, aid2, H5P_DEFAULT, H5P_DEFAULT);
    this -> status = H5Awrite(attr_mcs, H5T_NATIVE_INT, &mcs);
    this -> status = H5Aclose (attr_mcs);

    hid_t attr_seed = H5Acreate(file, "seed", H5T_NATIVE_INT, aid2, H5P_DEFAULT, H5P_DEFAULT);
    this -> status = H5Awrite(attr_seed, H5T_NATIVE_INT, &seed);
    this -> status = H5Aclose (attr_seed);

    hid_t attr_kb = H5Acreate(file, "kb", H5T_NATIVE_DOUBLE, aid2, H5P_DEFAULT, H5P_DEFAULT);
    this -> status = H5Awrite(attr_kb, H5T_NATIVE_DOUBLE, &kb);
    this -> status = H5Aclose (attr_kb);


}


void Reporter::partial_report(
    const std::vector<Real>& enes,
    const std::vector< std::vector<Real> >& histMag_x,
    const std::vector< std::vector<Real> >& histMag_y,
    const std::vector< std::vector<Real> >& histMag_z,
    Lattice& lattice, Index index)
{
    this -> start_[0] = index;


    this -> status = H5Sselect_hyperslab(this -> dataspace_id_energy, H5S_SELECT_SET, this -> start_,
                                  this -> stride_, this -> count_, this -> block_);
    this -> status = H5Dwrite (this -> energies_dset, H5T_NATIVE_DOUBLE, this -> memspace_id_,
                       this -> dataspace_id_energy, H5P_DEFAULT, enes.data());

    Index i = 0;
    for (auto& val : this -> mags_dset_x_)
    {
        this -> status = H5Sselect_hyperslab(this -> dataspace_id_mag_x_.at(i), H5S_SELECT_SET, this -> start_,
                                      this -> stride_, this -> count_, this -> block_);
        this -> status = H5Dwrite (val, H5T_NATIVE_DOUBLE, this -> memspace_id_,
                                   this -> dataspace_id_mag_x_.at(i), H5P_DEFAULT, histMag_x.at(i).data());

        this -> status = H5Sselect_hyperslab(this -> dataspace_id_mag_y_.at(i), H5S_SELECT_SET, this -> start_,
                                      this -> stride_, this -> count_, this -> block_);
        this -> status = H5Dwrite (mags_dset_y_.at(i), H5T_NATIVE_DOUBLE, this -> memspace_id_,
                                   this -> dataspace_id_mag_y_.at(i), H5P_DEFAULT, histMag_y.at(i).data());

        this -> status = H5Sselect_hyperslab(this -> dataspace_id_mag_z_.at(i), H5S_SELECT_SET, this -> start_,
                                      this -> stride_, this -> count_, this -> block_);
        this -> status = H5Dwrite (mags_dset_z_.at(i), H5T_NATIVE_DOUBLE, this -> memspace_id_,
                                   this -> dataspace_id_mag_z_.at(i), H5P_DEFAULT, histMag_z.at(i).data());
        i++;
    }


    this -> start_finalstates[0] = index;
    i = 0;
    for(auto& atom : lattice.getAtoms())
    {
        this -> start_finalstates[1] = i;
        std::vector<double> spin;
        spin.assign(std::begin(atom.getSpin()), std::end(atom.getSpin()));

        this -> status = H5Sselect_hyperslab(this -> dataspace_id_finalstates, H5S_SELECT_SET, this -> start_finalstates,
                                             this -> stride_finalstates, this -> count_finalstates, this -> block_finalstates);
        this -> status = H5Dwrite (this -> finalstates_dset, H5T_NATIVE_DOUBLE, this -> memspace_id_finalstates,
                                   this -> dataspace_id_finalstates, H5P_DEFAULT, spin.data());

        i++;
    }

}

void Reporter::close()
{
    Index i = 0;
    for (auto& val : this -> mags_dset_x_)
    {
        this -> status = H5Dclose(val);
        this -> status = H5Dclose(mags_dset_y_.at(i));
        this -> status = H5Dclose(mags_dset_z_.at(i));
        i++;
    }

    this -> status = H5Dclose(this -> energies_dset);
    this -> status = H5Dclose(this -> temps_dset);
    this -> status = H5Dclose(this -> fields_dset);
    this -> status = H5Dclose(this -> position_dset);
    this -> status = H5Dclose(this -> types_dset);
    this -> status = H5Dclose(this -> finalstates_dset);
    this -> status = H5Fclose(this -> file);
}

Reporter::~Reporter()
{

}
