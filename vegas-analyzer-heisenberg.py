import h5py
import numpy
import os
import matplotlib
matplotlib.use("PDF")
from matplotlib import pyplot
from matplotlib.backends.backend_pdf import PdfPages
import glob
import click
from mpl_toolkits.mplot3d import Axes3D
from matplotlib.patches import FancyArrowPatch
from mpl_toolkits.mplot3d import proj3d
from collections import defaultdict


def get_equals(lista):
    elements = [{i} for i in range(len(lista))]
    for i, val1 in enumerate(lista):
        for j in range(i + 1, len(lista)):
            if (val1 == lista[j]):
                elements[i].add(j)
            else:
                break

    lista2 = list(reversed(lista))
    elements2 = [{len(lista) - 1 - i} for i in range(len(lista))]
    for i, val1 in enumerate(lista2):
        for j in range(i + 1, len(lista2)):
            if (val1 == lista2[j]):
                elements2[i].add(len(lista) - 1 - j)
            else:
                break
    elements2 = list(reversed(elements2))
    final_elements = [tuple(sorted(elements[i] | elements2[i]))
                      for i in range(len(lista))]
    return sorted(set(final_elements))


@click.command()
@click.argument("FILE")
def main(file):
    out = os.path.abspath(os.path.join(file, os.pardir))
    data = h5py.File(file, "r")
    mcs = data.attrs["mcs"]
    seed = data.attrs["seed"]
    temps = data.get("temperature")[:]
    fields = data.get("field")[:]
    num_sites = len(data.get("positions"))

    types = numpy.unique(data.get("types")[:])
    types = [t.decode("utf-8") for t in types]


    num_sites_types = {t: len(data.get("types")[
        data.get("types")[:] == t.encode()])
        for t in types}

    join = [(temps[i], fields[i]) for i in range(len(temps))]
    equals = get_equals(join)

    temps_new = []
    fields_new = []
    repeated = [len(i) for i in equals]
    for i in equals:
        temps_new.append(temps[i[0]])
        fields_new.append(fields[i[0]])
        for j in i:
            for k in i:
                assert((temps[j], fields[j]) == (temps[k], fields[k]))
    temps = temps_new[:]
    fields = fields_new[:]
    
    mags_x = [list() for _ in range(len(equals))]
    mags_y = [list() for _ in range(len(equals))]
    mags_z = [list() for _ in range(len(equals))]
    mags_types_x = {t: [list() for _ in range(len(equals))] for t in types}
    mags_types_y = {t: [list() for _ in range(len(equals))] for t in types}
    mags_types_z = {t: [list() for _ in range(len(equals))] for t in types}
    energy = [list() for _ in range(len(equals))]
    for i, eq in enumerate(equals):
        for j in eq:
            mags_x[i] += list(data.get("magnetization_x")[j, :])
            mags_y[i] += list(data.get("magnetization_y")[j, :])
            mags_z[i] += list(data.get("magnetization_z")[j, :])
            energy[i] += list(data.get("energy")[j, :])
            for t in types:
                mags_types_x[t][i] += list(data.get("%s_x" % t)[j, :])
                mags_types_y[t][i] += list(data.get("%s_y" % t)[j, :])
                mags_types_z[t][i] += list(data.get("%s_z" % t)[j, :])
    mags_x = [numpy.array(M) for M in mags_x]
    mags_y = [numpy.array(M) for M in mags_y]
    mags_z = [numpy.array(M) for M in mags_z]
    energy = [numpy.array(M) for M in energy]
    for t in types:
        mags_types_x[t] = [numpy.array(M) for M in mags_types_x[t]]
        mags_types_y[t] = [numpy.array(M) for M in mags_types_y[t]]
        mags_types_z[t] = [numpy.array(M) for M in mags_types_z[t]]

    tau = [len(M)//5 for M in energy]

    mean_mags = numpy.array([numpy.mean(numpy.linalg.norm([
            mags_x[i], mags_y[i], mags_z[i]], axis=0)[tau[i]:]) / num_sites
            for i, _ in enumerate(mags_x)])


    mean_mags_types = {t: numpy.array([numpy.mean(numpy.linalg.norm([
            mags_types_x[t][i], mags_types_y[t][i], mags_types_z[t][i]],
            axis=0)[tau[i]:]) / num_sites_types[t]
            for i, _ in enumerate(mags_types_x[t])]) for t in types}

    mean_mags_z = numpy.array([numpy.mean(mags_z[i][tau[i]:]) / num_sites
                               for i, _ in enumerate(mags_z)])
    mean_mags_types_z = {t: numpy.array([
        numpy.mean(mags_types_z[t][i][tau[i]:]) / num_sites_types[t]
        for i, _ in enumerate(mags_types_z[t])]) for t in types}

    mean_ene = numpy.array([numpy.mean(energy[i][tau[i]:]) / num_sites
                            for i, _ in enumerate(energy)])
    

    susceptibility = numpy.array([numpy.std(numpy.linalg.norm([
            mags_x[i], mags_y[i], mags_z[i]],
            axis=0)[tau[i]:]) ** 2 / temps[i] / num_sites
            for i, _ in enumerate(mags_x)])

    susceptibility_types = {t : numpy.array([numpy.std(numpy.linalg.norm([
            mags_types_x[t][i], mags_types_y[t][i], mags_types_z[t][i]],
            axis=0)[tau[i]:]) ** 2 / temps[i] / num_sites_types[t]
            for i, _ in enumerate(mags_x)]) for t in types }

    specific_heat = numpy.array([
        numpy.std(energy[i][tau[i]:])**2 / (temps[i]**2) / num_sites
        for i, _ in enumerate(energy)])
    

    pp = PdfPages(file.replace(".h5", ".pdf"))


    fig = pyplot.figure(figsize=(16, 9))
    ax = fig.add_subplot("221")
    ax.plot(temps, mean_mags, label=r"$M_{T}$")
    for t in types:
        ax.plot(temps, mean_mags_types[t], label=r"$M_{%s}$" % t)
    ax.grid()
    ax.legend(loc="best", fontsize=4)
    ax.set_xlabel(r"$T$", fontsize=30)
    ax.set_ylabel(r"$M$", fontsize=30)
    ax.set_title("Magnetization")
    
    text = "Seed = {}\nMCS = {}".format(seed, mcs)
    props = dict(boxstyle='round', facecolor='yellowgreen', alpha=1.0)
    ax.text(pyplot.xlim()[-1], pyplot.ylim()[-1], text, fontsize=4, horizontalalignment="right",
            verticalalignment='top', bbox=props, fontweight="bold")


    ax = fig.add_subplot("222")
    ax.plot(temps, mean_ene)
    ax.grid()
    ax.set_xlabel(r"$T$", fontsize=30)
    ax.set_ylabel(r"$E$", fontsize=30)
    ax.set_title("Energy")

    ax = fig.add_subplot("223")
    ax.plot(temps, susceptibility, label=r"$\chi_{T}$")
    for t in types:
        ax.plot(temps, susceptibility_types[t], label=r"$\chi_{%s}$" % t)
    ax.grid()
    ax.legend(loc="best", fontsize=4)
    ax.set_xlabel(r"$T$", fontsize=30)
    ax.set_ylabel(r"$\chi$", fontsize=30)
    ax.set_title("Susceptibility")

    ax = fig.add_subplot("224")
    ax.plot(temps, specific_heat)
    ax.grid()
    ax.set_xlabel(r"$T$", fontsize=30)
    ax.set_ylabel(r"$C_V$", fontsize=30)
    ax.set_title("Specific heat")

    fig.subplots_adjust(hspace=0.5)
    fig.subplots_adjust(wspace=0.5)
    

    pyplot.savefig(pp, format="pdf")

    fig = pyplot.figure(figsize=(16, 9))
    ax = fig.add_subplot("221")
    ax.plot(fields, mean_mags_z, label=r"$M_{T}$")
    for t in types:
        ax.plot(fields, mean_mags_types_z[t], label=r"$M_{%s}$" % t)
    ax.grid()
    ax.legend(loc="best", fontsize=4)
    ax.set_xlabel(r"$H$", fontsize=30)
    ax.set_ylabel(r"$M$", fontsize=30)
    ax.set_title("Magnetization")
    

    ax = fig.add_subplot("222")
    ax.plot(fields, mean_ene)
    ax.grid()
    ax.set_xlabel(r"$H$", fontsize=30)
    ax.set_ylabel(r"$E$", fontsize=30)
    ax.set_title("Energy")

    ax = fig.add_subplot("223")
    ax.plot(fields, susceptibility, label=r"$\chi_{T}$")
    for t in types:
        ax.plot(fields, susceptibility_types[t], label=r"$\chi_{%s}$" % t)
    ax.grid()
    ax.legend(loc="best", fontsize=4)
    ax.set_xlabel(r"$H$", fontsize=30)
    ax.set_ylabel(r"$\chi$", fontsize=30)
    ax.set_title("Susceptibility")

    ax = fig.add_subplot("224")
    ax.plot(fields, specific_heat)
    ax.grid()
    ax.set_xlabel(r"$H$", fontsize=30)
    ax.set_ylabel(r"$C_V$", fontsize=30)
    ax.set_title("Specific heat")

    fig.subplots_adjust(hspace=0.5)
    fig.subplots_adjust(wspace=0.5)
    

    pyplot.savefig(pp, format="pdf")

    colors = ["purple", "pink", "gold", "black",
              "skyblue", "crimson", "green", "blue", "orange"]
    colors_types = {t: colors.pop() for t in types }


    fig = pyplot.figure(figsize=(16, 16))
    pos = data.get("positions")[data.get("positions")[:, 2] == 0, :]
    sub_types = data.get("types")[data.get("positions")[:, 2] == 0]
    colors_list = [colors_types[t.decode("utf-8")] for t in sub_types]
    pyplot.scatter(pos[:, 0], pos[:, 1], c=colors_list, s=500)
    pyplot.xlabel(r"$x$", fontsize=4)
    pyplot.ylabel(r"$y$", fontsize=4)    
    pyplot.savefig(pp, format="pdf")


    def get_indices(temps, fields):
        index = list()
        titles = list()
        for i in range(1, len(temps)):
            if (temps[i] == temps[i - 1]):
                index.append(i - 1)
                titles.append("Start")
                break

        index.append(numpy.argmin(fields))
        titles.append("")
        
        index.append(-1)
        titles.append("Final")

        return index, titles

    finalstates = numpy.array([data.get("finalstates")[i[-1], :] for i in equals])
    indices, titles = get_indices(temps, fields)

    for n, i in enumerate(indices):
        fig = pyplot.figure(figsize=(32, 16))
        fig.suptitle(r"$T=%f \hspace{2} H=%f \hspace{2} %s$" % (temps[i], fields[i], titles[n]), fontsize=50)

        ax = fig.add_subplot("121")
        pos = data.get("positions")[data.get("positions")[:, 1] == 0, :]
        sub_types = data.get("types")[data.get("positions")[:, 1] == 0]
        colors_list = [colors_types[t.decode("utf-8")] for t in sub_types]
        spins = finalstates[i, data.get("positions")[:, 1] == 0, :]
        
        ax.quiver(pos[:, 0], pos[:, 2], spins[:, 0], spins[:, 2],
                          pivot="middle", color=colors_list)

        ax.set_xlabel(r"$x$", fontsize=30)
        ax.set_ylabel(r"$z$", fontsize=30)
        ax.set_title("XZ view for y = 0")
        ax.set_aspect("equal")


        ax = fig.add_subplot("122")
        pos = data.get("positions")[data.get("positions")[:, 0] == 0, :]
        sub_types = data.get("types")[data.get("positions")[:, 0] == 0]
        colors_list = [colors_types[t.decode("utf-8")] for t in sub_types]
        spins = finalstates[i, data.get("positions")[:, 0] == 0, :]
        
        ax.quiver(pos[:, 1], pos[:, 2], spins[:, 1], spins[:, 2],
                          pivot="middle", color=colors_list)

        ax.set_xlabel(r"$y$", fontsize=30)
        ax.set_ylabel(r"$z$", fontsize=30)
        ax.set_title("YZ view for x = 0")
        ax.set_aspect("equal")

        pyplot.savefig(pp, format="pdf")
    

    pp.close()
    data.close()


    file_ = open(file.replace(".h5", ".mean"), mode="w")
    file_.write("# seed = {}\n".format(seed))
    file_.write("#\tT\tH\tE\tCv\tM\tMz\tX\t")
    for t in types:
        file_.write("%s\t%sz\tX_%s\t" % (t, t, t))
    file_.write("\n")
    for i, T in enumerate(temps):
        file_.write("{}\t{}\t{}\t{}\t{}\t{}\t{}\t".format(
            T, fields[i], mean_ene[i], specific_heat[i],
            mean_mags[i], mean_mags_z[i], susceptibility[i]))
        for t in types:
            file_.write("{}\t{}\t{}\t".format(
                mean_mags_types[t][i], mean_mags_types_z[t][i], susceptibility_types[t][i]))
        file_.write("\n")
    file_.close()


if __name__ == '__main__':
    main()