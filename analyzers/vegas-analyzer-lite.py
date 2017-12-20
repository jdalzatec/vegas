import h5py
import matplotlib
matplotlib.use("pdf")
from matplotlib import pyplot
import click
import numpy


@click.command()
@click.argument("file")
def main(file):
    dataset = h5py.File(file, mode="r")
    mcs = dataset.attrs["mcs"]
    seed = dataset.attrs["seed"]
    tau = mcs // 5
    num_ions = len(dataset.get("positions"))
    temps = dataset.get("temperature")[:]
    fields = dataset.get("field")[:]
    Mz = dataset.get("magnetization_z")[:, tau:] / num_ions
    Mz_mean = numpy.mean(Mz, axis=1)
    zeros = numpy.zeros_like(Mz_mean)
    # T, H, E, Cv, M, Mz, X, generic, genericz, X_generic
    dataset.close()


    file_ = open(file.replace(".h5", ".mean"), mode="w")
    file_.write("# seed = {}\n".format(seed))
    file_.write("#\tT\tH\tE\tCv\tM\tMz\tX\n")
    for i, T in enumerate(temps):
        file_.write("{}\t{}\t{}\t{}\t{}\t{}\t{}\n".format(
            T, fields[i], zeros[i], zeros[i],
            zeros[i], Mz_mean[i], zeros[i]))
    file_.close()


    pyplot.figure()
    pyplot.plot(fields, Mz_mean, "-o", label="$M_{z}$")
    pyplot.grid()
    pyplot.xlabel("$H$", fontsize=20)
    pyplot.ylabel("$M_{z}$", fontsize=20)
    # pyplot.tight_layout()
    pyplot.savefig(file.replace(".h5", ".pdf"))
    pyplot.close()

if __name__ == '__main__':
    main()