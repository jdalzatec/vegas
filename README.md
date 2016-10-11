# vegas
Software package for simulation, graphics and analysis tools for atomistic simulations of magnetic materials.

<b>vegas</b> is a software with novel features for different purposes. For example, the simulation data is saved into a HDF5 file in order to have all the history of the simularion. This history is important to compute critical exponents. For this reason, the averages are computed by means of a script (which can be made in python) as the user wants.
You can do many thing with <b>vegas</b>, like cooling processes, hysteresis loops or heat assisted recording media.

# Requirements
As it was mentioned, HDF5 for C is needed for <b>vegas</b>. This can be downloaded and installed from https://support.hdfgroup.org/HDF5/release/cmakebuild5110.html.

Other requirement is JsonCPP, which can be dowloaded from https://github.com/open-source-parsers/jsoncpp.

# Install
In order to install <b>vegas</b>, download the zip with the files and run the makefile with sudoer permission:
```bash
sudo make install
``` 
A executable file will be created in /usr/bin/ with name <b>vegas</b>. In this way, you can run vegas from anywhere. You can remove the folder zip with the source files if you want.

# Run
In order to run <b>vegas</b> it is necessary to have two files: a <b>sample</b> file and a <b>configuration Json</b> file.

## Sample
The sample should have the following format:
* The first line it composed by three values separated by spaces or tabs, which are:

  | num_ions | num_interactions | num_types |
  | ------------- |:-------------:| -----:|
  where **num_ions** is the total number of ions of the system, **num_interactions** is the total number of interactions and **num_types** is the total number of types of ions.
* The following **num_types** lines correspond to the type names. These lines have two values, a number and a string for the name. The number is a kind of index and it can be 0-index or 1-index. For example:
  
  | **1** | **Fe** |
  | ------------- |:-------------:|
  | **2** | **Co** |


* The following **num_ions** lines correspond to the ions. These lines should have the following format:
  
  | index | px | py | pz | spinNorm | ax | ay | az | Kan | hx | hy | hz | type | location |
  | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
  where:
  - **index** is the 0-index indicator of the ion. The higher **index** must be equal to **num_ions** - 1. *(int)*
  - **px**, **py** and **pz** are the location in x, y and z, repectively, of the ion. *(float)*
  - **spinNorm** is norm of the spin. *(float)*
  - **ax**, **ay** and **az** are the axis of anisotropy of the ion. *(float)*
  - **kan** is the anisotropy constant of the ion. *(float)*
  - **hx**, **hy** and **hz** are the direction in x, y and z, repectively, of the magnetic field. This vector has unit norm, but depending the application, could be modified. *(float)*
  - **type** is the type of the ion. *(string)*
  - **location** is the location of the ion, which can be *core* or *surface*. *(string)*

* The following **num_interactions** lines correspond to the geometric specification of the sample because, with that, the neighbors of certain ion are assigned. The format should be:

  | index_A | index_B | Jex |
  | ---- | ---- | ---- |
  which indicates that the site with index **index_A** has a neighbor with index **index_B** and they are coupled with a exchange constant of **Jex**. Therefore, if you want isotropic exchange coupling, must have a line of **index_B** with neighbor **index_A** coupled with **Jex**.
  
Finally, you can check the amount of lines, because the last line occupied should be the line with number equals to (**num_ions** + **num_interactions** + **num_types** + 1).

You can see an example of sample file [here](https://github.com/jdalzatec/vegas/blob/master/examples/some%20kind%20of%20simulations/training%20effect/samples/bulk_L_8.dat). Moreover, some python script was writing in order to help you in the construction of the sample. They can be consulted [here](https://github.com/jdalzatec/vegas/tree/master/examples/build%20samples)
