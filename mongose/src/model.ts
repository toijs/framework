
import mongoose, { Schema } from 'mongoose';
import { define, DefineType, resolve, config } from "@toikit/core";

let connections: any = {};

// Model
export function model(name: string, conn: string = 'default') {
  let accessName = '__db_' +conn + '_model_' + name;
  return resolve('model_' + accessName);
};

export function resolveModelByName(name: string, conn: string = 'default') {
  let accessName = '__db_' + conn + '_model_' + name;
  if (resolve('model_' + accessName)) return;

  let databaseConfig = config('mongo')?.connections || {};
  
  if (!databaseConfig.hasOwnProperty(conn)) throw Error('Database connection ' + conn + ' does not exist');
  if (!connections[conn]) {
    connections[conn] = mongoose.createConnection(databaseConfig[conn].uri, databaseConfig[conn]?.options);
  }

  const Model = connections[conn].model(name, Schema);
  define(DefineType.VALUE, 'model_' + accessName, Model);
}

export function resolveModel(names: any) {
  function binding(data) {
    if (typeof data === 'string') {
      let [name, conn] = data.split('/');
      resolveModelByName(name, conn);
    } else {
      resolveModelByName(data.name, data?.connection || 'default');
    }
  }

  if (Array.isArray(names)) {
    names.forEach(name => {
      binding(name);
    });
  }
  else binding(names);
}

export function resolveAllModels() {
  let names = resolve('__model_names') || [];
  return resolveModel(names);
}

export function defineModel(models: any, custom: any = {}) {
  let names = resolve('__model_names') || [];

  function binding(d) {
    let data = {...d, ...custom}
    let name = data.name;
    let conn = data?.connection || 'default';
    let accessName = '__db_' +conn + '_model_' + name;
    let keepName = conn + '/' + name;
    
    if (!names.includes(keepName)) names.push(keepName);
    define(DefineType.VALUE, 'model_attributes_' + accessName, data.attributes);
    define(DefineType.VALUE, 'model_options_' + accessName, data.options || {});
    define(DefineType.VALUE, 'model_mounted_' + accessName, data.mounted ? [data.mounted] : []);
  }

  if (Array.isArray(models)) {
    models.forEach(model => {
      binding(model);
    });
  } else {
    binding(models);
  }

  define(DefineType.VALUE, '__model_names', names);
};

export function withSoftDelete(schema: mongoose.Schema) {
  // Thêm trường deletedAt nếu chưa có
  if (!schema.path('deletedAt')) {
    schema.add({
      deletedAt: { type: Date, default: null }
    })
  }

  // Middleware tự động bỏ bản ghi bị xoá
  const autoExcludeDeleted = function (this: mongoose.Query<any, any>) {
    this.where({ deletedAt: null });
  }

  const middlewareTargets = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'count',
    'countDocuments'
    // Không cần findById vì là alias của findOne
  ]
  middlewareTargets.forEach((hook: any) => schema.pre(hook, autoExcludeDeleted))

  // Static method để soft-delete
  schema.statics.softDelete = async function (filter: any) {
    return this.updateMany(filter, { deletedAt: new Date() })
  }

  // Instance method nếu bạn muốn gọi từ doc instance
  schema.methods.softDelete = async function () {
    this.deletedAt = new Date()
    return this.save()
  }

  // Hook để thêm điều kiện vào mỗi lần gọi aggregate
  schema.pre('aggregate', function (next) {
    // Kiểm tra pipeline và tìm $match
    const pipeline = this.pipeline();
    
    // Tìm stage $match trong pipeline, nếu không có thì thêm $match vào
    const matchStage = pipeline.find(stage => '$match' in stage);

    if (!matchStage) {
      // Nếu không có $match, thêm điều kiện vào đầu pipeline
      this.match({ deletedAt: null }); // Hoặc { isDeleted: false }
    } else {
      // Nếu có $match, thêm điều kiện vào phần của $match
      matchStage.$match = { ...matchStage.$match, deletedAt: null }; // Hoặc matchStage.$match.isDeleted = false;
    }
    next();
  });
}