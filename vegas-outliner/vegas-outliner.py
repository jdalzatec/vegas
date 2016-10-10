import numpy
import colorsys
import click
import os


def list_to_vec(l):
    vec = "<"
    for i in l:
        vec += "{},".format(i)
    vec += ">"
    return vec


class Camera(object):
    def __init__(self, location, look_at=None, up=1):
        self.location = location
        self.sky = [0, 0, 1]
        self.up = [0, 0, up]
        self.right = [0, up, 0]
        if look_at is None:
            self.look_at = [0, 0, 0]
        else:
            self.look_at = look_at

    def to_str(self):
        location_str = list_to_vec(self.location)
        sky_str = list_to_vec(self.sky)
        up_str = list_to_vec(self.up)
        right_str = list_to_vec(self.right)
        look_at_str = list_to_vec(self.look_at)

        out = "camera{\n"
        out += "\tlocation " + location_str + "\n"
        out += "\tsky " + sky_str + "\n"
        out += "\tup " + up_str + "\n"
        out += "\tright " + right_str + "\n"
        out += "\tlook_at " + look_at_str + "\n"
        out += "}"
        return out


class Background(object):
    def __init__(self, color):
        self.color = color

    def to_str(self):
        out = "background{\n\tcolor "

        if type(self.color) == list or type(self.color) == tuple:
            out += "rgb " + list_to_vec(self.color)
        else:
            out += self.color
        out += "\n}"

        return out


class LightSource(object):
    def __init__(self, location, color):
        self.location = location
        self.color = color

    def to_str(self):
        out = "light_source{\n\t"
        out += list_to_vec(self.location) + "\n\tcolor "
        if type(self.color) == list or type(self.color) == tuple:
            out += "rgb " + list_to_vec(self.color)
        else:
            out += self.color
        out += "\n}"

        return out


class Finish(object):
    def __init__(self, **options):
        self.options = options

    def to_str(self):
        out = "finish{ "
        for key in self.options:
            out += str(key) + " " + str(self.options[key]) + " "
        out += "}"
        return out


class Object(object):
    def __init__(self, type_object, color, finish, *args):
        self.type_object = type_object
        self.color = color
        self.finish = finish
        self.args = args

    def to_str(self):
        out = str(self.type_object) + "{ "
        for i in list(self.args):
            if (type(i) in [list, numpy.ndarray]):
                out += list_to_vec(i) + " "
            else:
                out += str(i) + " "
        out += "pigment{ color "
        if type(self.color) == list or type(self.color) == tuple:
            out += "rgb " + list_to_vec(self.color)
        else:
            out += self.color
        out += " } "
        out += self.finish.to_str() + " }"
        return out


class Sphere(object):
    def __init__(self, location, radius, color, finish):
        self.location = location
        self.radius = radius
        self.color = color
        self.finish = finish

    def to_str(self):
        out = "sphere{ "
        out += list_to_vec(self.location) + " "
        out += str(self.radius) + " "
        out += "pigment{ color "
        if type(self.color) == list or type(self.color) == tuple:
            out += "rgb " + list_to_vec(self.color)
        else:
            out += self.color
        out += " } "
        out += self.finish.to_str() + " }"
        return out


class Arrow(object):
    def __init__(self, start, end, radius, ratio_x, ratio_y, color, finish):
        self.start = numpy.array(start, dtype=float)
        self.end = numpy.array(end, dtype=float)
        self.radius = radius
        self.ratio_x = ratio_x
        self.ratio_y = ratio_y
        self.color = color
        self.finish = finish

    def to_str(self):
        diff = self.end - self.start
        length = numpy.linalg.norm(diff)
        unit = diff / length
        mid = (length / (self.ratio_y + 1)) * unit + self.start
        radius_cylinder = self.radius / self.ratio_x

        out = "union{ "
        cylinder = Object("cylinder", self.color, self.finish,
                          self.start, mid, radius_cylinder)
        out += cylinder.to_str()
        cone = Object("cone", self.color, self.finish,
                      mid, self.radius, self.end, 0)
        out += " "
        out += cone.to_str()

        out += " }"
        return out


class PovRayPlot(object):
    def __init__(self, camera, include):
        self.camera = camera
        self.include = include
        self.objects = list()

    def append_object(self, obj):
        self.objects.append(obj)

    def to_str(self):
        out = ""
        for i in self.include:
            out += '#include "' + str(i) + '"\n'

        out += "\n"
        out += self.camera.to_str()
        out += "\n\n"

        for obj in self.objects:
            out += obj.to_str()
            out += "\n\n"
        return out

    def plot(self, name, width=500, height=500):
        out = self.to_str()
        file_ = open(name.replace("png", "pov"), mode="w")
        file_.write(out)
        file_.close()

        os.system("povray %s -W%i -H%i -O%s +A -D" % (
            name.replace("png", "pov"), width, height, name))
        os.system("rm %s" % (name.replace("png", "pov")))
        print("The plot has been saved at '%s' with width=%i and height=%i" % (
            name, width, height))

@click.command()
@click.argument("FILE")
@click.option("--width", "-W", default=2000, help="Set the width of the image.")
@click.option("--height", "-H", default=2000, help="Set the height of the image.")
@click.option('--camera', default=(100.0, 100.0, 30.0),
              help='Set the camera position.')
@click.option("--radius_spheres", default=0.2, help="Set the radius of the spheres.")
@click.option("--color_spheres", default=(1.0, 1.0, 1.5),
              help="Set the colors of the spheres in normalized rgb. Each color must be a tuple of 3")
@click.option("--outfile", default="image.png",
              help='Set the name of the image.')
@click.option("--radius_cone", default=0.3,
              help='Set the radius of the cone.')
@click.option("--ratio_x", default=3.0,
              help='Set ratio radio_cone/radio_cylinder.')
@click.option("--ratio_y", default=0.5,
              help='Set ratio height_cone/height_cylinder.')
@click.option("--axis", default="z", help="Set the axis for the hsv colors", type=click.Choice(["x", "y", "z"]))
@click.option("--color_mode", default="polar", help="Set the mode for the hsv colors", type=click.Choice(["azimuthal", "polar"]))
@click.option("--light_source", default=(100, 100, 100), help="Set the position of the light source")
def main(file, width, height, camera, radius_spheres, color_spheres, outfile, radius_cone, ratio_x, ratio_y, axis, color_mode, light_source):
    x, y, z, sx, sy, sz = numpy.loadtxt(file, unpack=True, usecols=(0, 1, 2, 4, 5, 6))
    types = numpy.loadtxt(file, unpack=True, usecols=(3, ), dtype="str")
    
    assert (ratio_x >= 1)

    set_types = set(types)
    colors_spheres = dict()
    if len(set_types) == 1:
        colors_spheres[set_types.pop()] = color_spheres
    else:
        colors_spheres[set_types.pop()] = list(numpy.random.random(size=(3)))

    cx = camera[0]
    cy = camera[1]
    cz = camera[2]

    centroide = numpy.array([numpy.mean(x), numpy.mean(y), numpy.mean(z), ])
    camera = Camera([cx, cy, cz], look_at=centroide)

    background = Background("White")
    light_source = LightSource(list(light_source), "White")

    povObj = PovRayPlot(camera, ["shapes.inc", "colors.inc", "textures.inc"])
    povObj.append_object(background)
    povObj.append_object(light_source)
    finish = Finish(ambient=0.2, diffuse=0.6, specular=0.0, roughness=0.01, metallic=1.0)

    for i, val in enumerate(x):
        sphere = Sphere([x[i], y[i], z[i]], radius_spheres, colors_spheres[types[i]], finish)
        pos = numpy.array([x[i], y[i], z[i]])
        state = numpy.array([sx[i], sy[i], sz[i]])
        unit = state / numpy.linalg.norm(state)
        
        # in  order to normalize the spin:
        # start = pos - 0.5 * state
        # end = pos + 0.5 * state

        # To let the spin with the real norm:
        start = pos - 0.5 * state
        end = pos + 0.5 * state

        if (axis == "z"):
            theta = numpy.arccos(sz[i] / numpy.linalg.norm(state))
            phi = numpy.arctan(sy[i]/sx[i])
            if (sx[i] < 0 and sy[i] > 0) or (sx[i] < 0 and sy[i] < 0):
                phi += numpy.pi

        elif (axis == "x"):
            theta = numpy.arccos(sx[i] / numpy.linalg.norm(state))
            phi = numpy.arctan(sz[i]/sy[i])
            if (sz[i] < 0 and sy[i] > 0) or (sz[i] < 0 and sy[i] < 0):
                phi += numpy.pi
        
        elif (axis == "y"):
            theta = numpy.arccos(sy[i] / numpy.linalg.norm(state))
            phi = numpy.arctan(sx[i]/sz[i])
            if (sx[i] < 0 and sz[i] > 0) or (sx[i] < 0 and sz[i] < 0):
                phi += numpy.pi

        color = colorsys.hsv_to_rgb(theta/(2*numpy.pi), 1.0, 1.0)
        if color_mode == "azimuthal":
            color = colorsys.hsv_to_rgb(phi, 1.0, 1.0)

        arrow = Arrow(start, end, radius_cone, ratio_x, ratio_y,
                      color, finish)
        povObj.append_object(arrow)
        povObj.append_object(sphere)

# radius, ratio_x, ratio_y, color, finish






    povObj.plot(outfile, width=width, height=height)

if __name__ == '__main__':
    main()