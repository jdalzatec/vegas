CC = g++
FLAGS = -O2 -std=c++11 -c -Wall
EFLAGS = -ffast-math -I ./code/include

all: main

main: main.o atom.o lattice.o system.o reporter.o
	$(CC) -O2 ./compilers/main.o \
			  ./compilers/atom.o \
			  ./compilers/lattice.o \
			  ./compilers/system.o \
			  ./compilers/reporter.o \
			  ./code/include/hdf5/lib/libhdf5_cpp.a \
			  ./code/include/hdf5/lib/libhdf5.a \
			  ./code/include/hdf5/lib/libhdf5_hl.a \
			  ./code/include/hdf5/lib/libhdf5_hl_cpp.a \
			  ./code/include/jsoncpp/lib/libjsoncpp.a \
			  -ldl -static \
			  -o vegas $(EFLAGS)

main.o:
	mkdir -p compilers
	$(CC) $(FLAGS) ./code/main.cc -o ./compilers/main.o $(EFLAGS)

atom.o:
	$(CC) $(FLAGS) ./code/src/atom.cc -o ./compilers/atom.o $(EFLAGS)

lattice.o:
	$(CC) $(FLAGS) ./code/src/lattice.cc -o ./compilers/lattice.o $(EFLAGS)

system.o:
	$(CC) $(FLAGS) ./code/src/system.cc -o ./compilers/system.o $(EFLAGS)

reporter.o:
	$(CC) $(FLAGS) ./code/src/reporter.cc -o ./compilers/reporter.o $(EFLAGS)