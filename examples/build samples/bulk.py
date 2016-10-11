import numpy
import click
from collections import defaultdict
from itertools import product
from matplotlib import pyplot

def print_arr(arr):
    for i in arr:
        print(i, end=" ")

@click.command()
@click.option("--lenght", "-l", default=10)
@click.option("--spin", "-s", default=1.0)
@click.option("--exchange", "-jex", default=1.0)
def main(lenght, spin, exchange):
    lattice = list()
    nbhs = defaultdict(list)
    for pos in product(range(lenght), range(lenght), range(lenght)):
        x, y, z = pos
        lattice.append(pos)

        nbhs[pos].append(((x+1)%lenght, y, z))
        nbhs[pos].append(((x-1+lenght)%lenght, y, z))
        nbhs[pos].append((x, (y+1)%lenght, z))
        nbhs[pos].append((x, (y-1+lenght)%lenght, z))

        nbhs[pos].append((x, y, (z+1)%lenght))
        nbhs[pos].append((x, y, (z-1+lenght)%lenght))


    for site, nbhs_site in nbhs.items():
        assert len(nbhs_site) == 6
        for nbh in nbhs_site:
            assert site in nbhs[nbh]

    num_interactions = 0
    for site in lattice:
        num_interactions += len(nbhs[site])

    num_sites = len(lattice)
    print(num_sites, num_interactions, 1)
    print(1, "generic")
    for i, site in enumerate(lattice):
        print(i, end=" ")
        print_arr(site)
        print(spin, end=" ")
        print_arr([0, 0, 1])
        print(0.0, end=" ")
        print_arr([0, 0, 1])
        print("generic", end=" ")
        print("core")

    for i, site in enumerate(lattice):
        for nbh in nbhs[site]:
            print(i, lattice.index(nbh), exchange)


if __name__ == '__main__':
    main()