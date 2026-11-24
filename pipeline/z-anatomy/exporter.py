# Export de maillages depuis l'atlas Z-Anatomy (fichier Blender), sans interface.
#
# Lancé par pipeline/04-z-anatomy.mjs :
#   blender -b sources/z-anatomy/Z-Anatomy/Startup.blend \
#           --python pipeline/z-anatomy/exporter.py -- <noms.json> <dossier_sortie>
#
# Pour chaque objet demandé : maillage évalué (modificateurs appliqués),
# transformé en coordonnées « monde », triangulé, écrit en OBJ (sommets + faces).
# Un fichier bornes.json récapitule les boîtes englobantes (utile au recalage
# sur BodyParts3D) et la liste des objets introuvables.

import bpy
import json
import os
import sys

argv = sys.argv[sys.argv.index('--') + 1:]
noms = json.load(open(argv[0], encoding='utf-8'))
sortie = argv[1]
os.makedirs(sortie, exist_ok=True)

depsgraph = bpy.context.evaluated_depsgraph_get()
bornes = {}
introuvables = []


def nom_fichier(nom):
    return ''.join(c if c.isalnum() or c in '-_.' else '_' for c in nom) + '.obj'


for nom in noms:
    obj = bpy.data.objects.get(nom)
    if obj is None or obj.type != 'MESH':
        introuvables.append(nom)
        continue
    ev = obj.evaluated_get(depsgraph)
    mesh = ev.to_mesh()
    mesh.calc_loop_triangles()
    mw = obj.matrix_world
    verts = [mw @ v.co for v in mesh.vertices]
    # Les objets du côté gauche sont souvent des copies en miroir (échelle
    # négative) : la transformation inverse alors l'ordre des sommets des faces,
    # ce qui retournerait les normales. On rétablit l'ordre dans ce cas.
    miroir = mw.determinant() < 0
    with open(os.path.join(sortie, nom_fichier(nom)), 'w', encoding='utf-8') as f:
        f.write(f'# Z-Anatomy (CC BY-SA 4.0) : {nom}\n')
        for v in verts:
            f.write(f'v {v.x:.6f} {v.y:.6f} {v.z:.6f}\n')
        for t in mesh.loop_triangles:
            a, b, c = t.vertices
            if miroir:
                b, c = c, b
            f.write(f'f {a + 1} {b + 1} {c + 1}\n')
    xs = [v.x for v in verts]; ys = [v.y for v in verts]; zs = [v.z for v in verts]
    bornes[nom] = {
        'fichier': nom_fichier(nom),
        'min': [min(xs), min(ys), min(zs)],
        'max': [max(xs), max(ys), max(zs)],
        'sommets': len(verts),
        'triangles': len(mesh.loop_triangles),
    }
    ev.to_mesh_clear()

json.dump({'bornes': bornes, 'introuvables': introuvables}, open(os.path.join(sortie, 'bornes.json'), 'w', encoding='utf-8'), indent=1)
print(f'Export Z-Anatomy : {len(bornes)} objets, {len(introuvables)} introuvables')
