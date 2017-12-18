FROM ubuntu:16.10
RUN apt-get update -q -y
RUN apt-get upgrade -q -y
RUN apt-get install -q -y python3 libhdf5-dev libjsoncpp-dev
RUN apt-get install -q -y cmake build-essential apt-utils python3-pip
# RUN apt-get clean all
# RUN apt-get autoclean 
# RUN apt-get autoremove 
ENV LC_ALL C.UTF-8
RUN pip3 install click numpy tqdm h5py matplotlib
ADD . /vegas
RUN mkdir /vegas/build
WORKDIR /vegas/build

RUN cmake ../compilers/linux && make && make install
RUN cp ../vegas-analyzer-heisenberg.py /opt/
RUN cp ../vegas-analyzer-lite.py /opt/
RUN cp ../vegas-analyzer-xyz.py /opt/
RUN mv ../vegas-analyzer-heisenberg.py .
RUN mv ../vegas-analyzer-lite.py .
RUN mv ../vegas-analyzer-xyz.py .