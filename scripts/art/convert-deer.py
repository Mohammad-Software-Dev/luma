import bpy,sys
source, destination = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=source,use_scripts=False)
for o in list(bpy.data.objects):
 if o.name not in ['Body','Eyes','Head','Horns','Armature']:bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):
 if a.name not in ['Idle.000','Run','Eat.001','Die.000']:bpy.data.actions.remove(a)
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 mat=bpy.data.materials.new(o.name+'_PBR');mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.86
 diffuse={'Body':'body','Head':'head','Horns':'deer-antlers.png'}.get(o.name)
 normal={'Body':'deer-body-normal.png','Head':'deer-head-normal.png','Horns':'deer-antlers-normal.png'}.get(o.name)
 if diffuse:
  tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.get(diffuse);mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
 else:bsdf.inputs['Base Color'].default_value=(.035,.025,.01,1);bsdf.inputs['Roughness'].default_value=.2
 if normal:
  tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.get(normal);tex.image.colorspace_settings.name='Non-Color';n=mat.node_tree.nodes.new('ShaderNodeNormalMap');mat.node_tree.links.new(tex.outputs['Color'],n.inputs['Color']);mat.node_tree.links.new(n.outputs['Normal'],bsdf.inputs['Normal'])
 o.data.materials.clear();o.data.materials.append(mat)
arm=bpy.data.objects['Armature'];arm.animation_data.action=bpy.data.actions.get('Idle.000');bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=destination,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_image_format='JPEG',export_jpeg_quality=90,export_anim_single_armature=True)
