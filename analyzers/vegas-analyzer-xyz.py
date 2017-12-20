import numpy
import matplotlib
matplotlib.use("pdf")
from matplotlib import pyplot
from matplotlib.backends.backend_pdf import PdfPages
import click
import h5py

@click.command()
@click.argument("file")
def main(file):
    pp = PdfPages('%s' % file.replace(".h5", "_xyz.pdf"))

    dataset = h5py.File(file, mode="r")
    mcs = dataset.attrs.get("mcs")
    kb = dataset.attrs.get("kb", 1.0)
    seed = dataset.attrs.get("seed")

    tau = mcs // 2

    temps = dataset.get("temperature")[:]
    fields = dataset.get("field")[:]

    energy = dataset.get("energy")[:, tau:]
    magx = dataset.get("magnetization_x")[:, tau:]
    magy = dataset.get("magnetization_y")[:, tau:]
    magz = dataset.get("magnetization_z")[:, tau:]
    dataset.close()

    magx_mean = numpy.mean(magx, axis=1)
    magx_abs_mean = numpy.abs(numpy.mean(magx, axis=1))

    magy_mean = numpy.mean(magy, axis=1)
    magy_abs_mean = numpy.abs(numpy.mean(magy, axis=1))

    magz_mean = numpy.mean(magz, axis=1)
    magz_abs_mean = numpy.abs(numpy.mean(magz, axis=1))

    mag = numpy.array([magx, magy, magz])
    mag_mean = numpy.mean(numpy.linalg.norm(mag, axis=0), axis=1)

    energy_mean = numpy.mean(energy, axis=1)

    chix = numpy.std(magx, axis=1) ** 2 / (kb * temps)
    chiy = numpy.std(magy, axis=1) ** 2 / (kb * temps)
    chiz = numpy.std(magz, axis=1) ** 2 / (kb * temps)
    
    chi = numpy.std(numpy.linalg.norm(mag, axis=0), axis=1) ** 2 / (kb * temps)

    cv = numpy.std(energy, axis=1) ** 2 / (kb * temps**2)


    for xlabel, xarr in zip(["T", "H"], [temps, fields]):
        fig = pyplot.figure(figsize=(20, 10))
        ax1 = pyplot.subplot2grid((2, 5), (0, 0))
        ax2 = pyplot.subplot2grid((2, 5), (0, 1))
        ax3 = pyplot.subplot2grid((2, 5), (0, 2))
        ax4 = pyplot.subplot2grid((2, 5), (0, 3))
        ax5 = pyplot.subplot2grid((2, 5), (0, 4))
        ax6 = pyplot.subplot2grid((2, 5), (1, 0))
        ax7 = pyplot.subplot2grid((2, 5), (1, 1))
        ax8 = pyplot.subplot2grid((2, 5), (1, 2))
        ax9 = pyplot.subplot2grid((2, 5), (1, 3))
        ax10 = pyplot.subplot2grid((2, 5), (1, 4))
        
        ax1.plot(xarr, magx_mean, "-g", label=r"$\left< M_{x} \right>$")
        ax1.plot(xarr, magx_abs_mean, "-r", label=r"$ \left | \left< M_{x} \right> \right |$")
        
        ax2.plot(xarr, magy_mean, "-g", label=r"$\left< M_{y} \right>$")
        ax2.plot(xarr, magy_abs_mean, "-r", label=r"$ \left | \left< M_{y} \right> \right |$")

        ax3.plot(xarr, magz_mean, "-g", label=r"$\left< M_{z} \right>$")
        ax3.plot(xarr, magz_abs_mean, "-r", label=r"$ \left | \left< M_{z} \right> \right |$")

        ax4.plot(xarr, mag_mean, "-g", label=r"$\left< M \right>$")

        ax5.plot(xarr, energy_mean, "-g", label=r"$\left< E \right>$")

        ax6.plot(xarr, chix, "-g", label=r"$\chi_{x}$")
        ax7.plot(xarr, chiy, "-g", label=r"$\chi_{y}$")
        ax8.plot(xarr, chiz, "-g", label=r"$\chi_{z}$")
        
        ax9.plot(xarr, chi, "-g", label=r"$\chi$")
        ax10.plot(xarr, cv, "-g", label=r"$C_{v}$")


        for ax in [ax1, ax2, ax3, ax4, ax5, ax6, ax7, ax8, ax9, ax10]:
            ax.grid()
            ax.legend(loc="best", fontsize=20)
            ax.set_xlabel(r"$%s$" % xlabel, fontsize=20)

        pyplot.tight_layout()
        pyplot.savefig(pp, format="pdf")
        pyplot.close()

    pp.close()


    outdata = open("%s" % file.replace(".h5", "_xyz.mean"), mode="w")
    outdata.write("# seed = %s\n" % seed)
    outdata.write("# T H E Cv Mx My Mz M Chix Chiy Chiz Chi\n")
    for i in range(len(temps)):
        outdata.write("{} {} {} {} {} {} {} {} {} {} {} {}\n".format(
            temps[i], fields[i], energy_mean[i], cv[i],
            magx_mean[i], magy_mean[i], magz_mean[i], mag_mean[i],
            chix[i], chiy[i], chiz[i], chi[i]))
    outdata.close()


if __name__ == '__main__':
    main()