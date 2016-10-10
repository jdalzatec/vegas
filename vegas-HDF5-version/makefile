CC = g++
FLAGS = -O2 -std=c++11 -c -Wall
EFLAGS = -ffast-math -lhdf5 -ljsoncpp

all: main

run: main
	./main

install: prerequisite main
	mv vegas /usr/bin/
	make clean

prerequisite:
	sudo apt-get install libjsoncpp-dev
	sudo apt-get install libhdf5-dev libhdf5-serial-dev

main: main.o atom.o lattice.o reporter.o system.o
	$(CC) -O2 ./compilers/main.o \
			  ./compilers/atom.o \
			  ./compilers/lattice.o \
			  ./compilers/reporter.o \
			  ./compilers/system.o \
			  -o vegas $(EFLAGS)

main.o:
	mkdir -p compilers
	$(CC) $(FLAGS) ./src/main.cc -o ./compilers/main.o $(EFLAGS)


atom.o:
	$(CC) $(FLAGS) ./src/atom.cc -o ./compilers/atom.o $(EFLAGS)

lattice.o:
	$(CC) $(FLAGS) ./src/lattice.cc -o ./compilers/lattice.o $(EFLAGS)

reporter.o:
	$(CC) $(FLAGS) ./src/reporter.cc -o ./compilers/reporter.o $(EFLAGS)

system.o:
	$(CC) $(FLAGS) ./src/system.cc -o ./compilers/system.o $(EFLAGS)

profile:
	gprof vegas gmon.out

clean:
	rm -rf compilers vegas gmon.out
