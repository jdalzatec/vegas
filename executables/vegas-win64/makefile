CC = g++
FLAGS = -O2 -std=c++11 -c -Wall -ldl -lz -static -static-libstdc++ -static-libgcc -lc
EFLAGS = -ffast-math -I ../../code/include -L /usr/HDF5/1.8.18/bin -l:hdf5.dll -L /usr/local/lib -l:libjsoncpp.a
# EFLAGS = -ffast-math -I ../../code/include -L /usr/HDF5/1.10.0/bin -l:hdf5.dll -L /usr/local/lib -l:libjsoncpp.a
# EFLAGS = -ffast-math -I ../../code/include -lhdf5 -ljsoncpp


all: main

run: main
	./main

install: main
	mv vegas /usr/bin/
	make clean

main: main.o atom.o lattice.o system.o reporter.o
	$(CC) -O2 ./compilers/main.o \
			  ./compilers/atom.o \
			  ./compilers/lattice.o \
			  ./compilers/system.o \
			  ./compilers/reporter.o \
			  -o vegas $(EFLAGS)

main.o:
	mkdir -p compilers
	$(CC) $(FLAGS) ../../code/main.cc -o ./compilers/main.o $(EFLAGS)

atom.o:
	$(CC) $(FLAGS) ../../code/src/atom.cc -o ./compilers/atom.o $(EFLAGS)

lattice.o:
	$(CC) $(FLAGS) ../../code/src/lattice.cc -o ./compilers/lattice.o $(EFLAGS)

system.o:
	$(CC) $(FLAGS) ../../code/src/system.cc -o ./compilers/system.o $(EFLAGS)

reporter.o:
	$(CC) $(FLAGS) ../../code/src/reporter.cc -o ./compilers/reporter.o $(EFLAGS)

profile:
	gprof vegas gmon.out

clean:
	rm -rf compilers vegas gmon.out

test: test.o atom.o
	$(CC) -pg ./compilers/test.o \
			  ./compilers/atom.o \
			  -o test $(EFLAGS)
	./test