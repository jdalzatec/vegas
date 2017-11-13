FROM ubuntu:16.10
RUN apt-get update -q -y
RUN apt-get install -q -y libhdf5-dev libjsoncpp-dev
RUN apt-get install -q -y cmake build-essential
ADD . /vegas
RUN mkdir /vegas/build
WORKDIR /vegas/build

RUN cmake ../compilers/linux && make && make install