import json
import numpy
import glob


def main():
    samples = glob.glob("samples/*.dat")
    amount_cycles = 3

    fields = list(numpy.linspace(-2, 2, 200))
    fields += list(reversed(fields))
    fields *= amount_cycles

    for f in samples:
        for i in range(1):
            data = {"mcs": 1000,
                    "model": "heisenberg",
                    "anisotropy": "uniaxial",
                    "temperature": 0.01,
                    "field": list(fields),
                    "seed": numpy.random.randint(100000, 100000000)
                    }
            out = f.replace("samples/", "simulations/").replace(".dat", "_%i.h5" % i)
            out_json = out.replace(".h5", ".json")
            data["out"] = out
            data["sample"] = f
            with open(out_json, 'w') as file:
                 json.dump(data, file)
                 file.close()

    for f in glob.glob("simulations/*.json"):
        print("time vegas %s" % f)



if __name__ == '__main__':
    main()