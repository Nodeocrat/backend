module.exports = class OrderedHash {
  constructor(options){
    // deserialize from JSON
    this._data = [];
    this._map = {};

    if(options){
      if(options.JSON){
        this._data = JSON.parse(options.JSON._data);
        this._map = JSON.parse(options.JSON._map);
      } else if (options.clone){
        for(let valToClone of options.clone._data){
          if(valToClone !== null && typeof valToClone === 'object')
            this._data.push(Object.assign({}, valToClone));
          else
            this._data.push(valToClone);
        }
        this._map = Object.assign({}, options.clone._map);
      }

      if(options.init){
        const obj = options.init;
        for (let key in obj) {
    		  if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if(value !== null && typeof value === 'object'){
              const clonedObj = Object.assign({}, value);
              this.insert(key, clonedObj);
            } else if (value.constructor === Array){
              const clonedArray = value.slice();
              this.insert(key, clonedArray);
            } else {
              this.insert(key, value);
            }
          }
        }
      }
    }
  }

  toJSON(){
    return {
      "_map": JSON.stringify(this._map),
      "_data": JSON.stringify(this._data)
    };
  }

  [Symbol.iterator]() {
    let index = -1;
    const data  = this._data;

    return {
      next: () => ({ value: data[++index], done: !(index in data) })
    };
  }

  map(callback){
    return this._data.map(callback);
  }

  insert(key, value){
    if(!this._map.hasOwnProperty(key)){
      this._map[key] = this._data.push(value) - 1;
    } else {
      const index = this._map[key];
      this._data[index] = value;
    }
  }

  //array must be an array of objects and keyField is the property of the objects
  //to use as the key.
  insertMany(array, keyField){
    for(let value of array)
      this.insert(value[keyField], value);
  }

  remove(key){
    const i = this._map[key];
    if(i !== -1)
      this._data.splice(i, 1);

    delete this._map[key];
  }

  get(key){
    const index = this._map[key];
    return this._data[index];
  }
}
