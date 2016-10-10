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
