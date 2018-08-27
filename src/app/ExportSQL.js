import React from 'react';
import electron from 'electron';

import {Button, Checkbox, Editor, RadioGroup, Select, TreeSelect, openModal} from '../components';
import { getAllDataSQLByFilter } from '../utils/json2code';
import { readFilePromise, saveFilePromise } from '../utils/json';
import defaultConfig from '../../profile';

const { remote } = electron;
const { app } = remote;
const { Radio } = RadioGroup;

export default class ExportSQL extends React.Component{
  constructor(props){
    super(props);
    this.split = process.platform === 'win32' ? '\\' : '/';
    this.configPath = app.getPath('userData');
    this.historyPath = `${this.configPath}${this.split}${defaultConfig.userPath}`;
    this.state = {
      selectTable: null,
      export: 'all',
      defaultDb: props.defaultDb,
      type: {
        deleteTable: false,
        createTable: false,
        createIndex: false,
        updateComment: false,
      },
      data: getAllDataSQLByFilter(props.dataSource,
        props.defaultDb, ['deleteTable', 'createTable', 'createIndex', 'updateComment']),
    };
  }
  componentDidMount(){
    this._getConfigData().then((res) => {
      this.userData = res;
      const exportSqlDefault = this.userData.exportSqlDefault || {};
      this.setState({
        type: {
          deleteTable: exportSqlDefault.deleteTable || false,
          createTable: exportSqlDefault.createTable || false,
          createIndex: exportSqlDefault.createIndex || false,
          updateComment: exportSqlDefault.updateComment || false,
        },
      });
    });
  }
  getData = () => {
    return this.state.data;
  };
  getValue = () => {
    let tempValue = [];
    if (this.state.export === 'all') {
      tempValue = ['deleteTable', 'createTable', 'createIndex', 'updateComment'];
    } else {
      tempValue = Object.keys(this.state.type).filter(t => this.state.type[t]);
    }
    return {
      value: tempValue,
      defaultDb: this.state.defaultDb,
    };
  };
  _exportChange = (e) => {
    this.setState({
      export: e,
    });
  };
  _typeChange = (e, type) => {
    this.setState({
      type: {
        ...this.state.type,
        [type]: e.target.value,
      },
    });
  };
  _onDBChange = (e) => {
    this.setState({
      defaultDb: e.target.value,
    });
  };
  _getMode = (value) => {
    let mode = 'mysql';
    if (value.includes('sql')) {
      mode = 'mysql';
    } else if (value.includes('java')) {
      mode = 'java';
    }
    return mode;
  };
  _valueChange = (e) => {
    this.setState({
      data: e.target.value,
    });
  };
  _preview = () => {
    const { dataSource } = this.props;
    const { defaultDb, selectTable } = this.state;
    let tempDataSource = {...dataSource};
    if (selectTable) {
      const tables = selectTable.filter(t => t.includes('/')).map(t => t.split('/')[1]);
      tempDataSource = {
        ...tempDataSource,
        modules: (tempDataSource.modules || []).map((m) => {
          return {
            ...m,
            entities: (m.entities || []).filter(e => tables.includes(e.title)),
          };
        }),
      };
    }
    this.setState({
      data: getAllDataSQLByFilter(tempDataSource,
        defaultDb, this.getValue().value),
    });
  };
  _export = () => {
    // 保存当前导出的数据信息
    this._saveConfigData({
      ...this.userData,
      exportSqlDefault: {
        ...this.state.type,
      },
    }).then(() => {
      const { exportSQL } = this.props;
      exportSQL && exportSQL();
    });
  };
  _selectTable = () => {
    const { selectTable } = this.state;
    const { dataSource } = this.props;
    openModal(<TreeSelect data={dataSource.modules || []} defaultSelecteds={selectTable}/>, {
      title: '导出数据表选择',
      onOk: (m, c) => {
        this.setState({
          selectTable: c.getKeys() || [],
        });
        m && m.close();
      },
    });
  };
  _getConfigData = () => {
    return readFilePromise(this.historyPath);
  };
  _saveConfigData = (data) => {
    return saveFilePromise(data, this.historyPath);
  };
  render() {
    const { database } = this.props;
    const { data, defaultDb, selectTable } = this.state;
    return (<div style={{display: 'flex'}}>
      <div
        style={{
          width: 'calc(100% - 400px)',
          border: 'solid 1px #DFDFDF',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 50,
          marginRight: '5px',
          //justifyContent: 'center',
        }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: 5,
        }}>
          <span style={{width: 110, textAlign: 'right'}}>数据库:</span>
          <Select onChange={this._onDBChange} value={this.state.defaultDb} style={{marginLeft: 10}}>
            {
              database.map(db => (<option key={db.code} value={db.code}>{db.code}</option>))
            }
          </Select>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: 5,
          }}
        >
          <span style={{width: 110, textAlign: 'right'}}>导出数据表:</span>
          <span style={{marginLeft: 10}}>
            {selectTable === null ? '默认导出所有数据表' :
              `当前已选择数据表数量：${selectTable.filter(k => k.includes('/')).length}`}
          </span>
          <Button style={{marginLeft: 10}} title='选择数据表' onClick={this._selectTable}>...</Button>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: 5,
        }}>
          <span style={{width: 151, textAlign: 'right'}}>导出内容:</span>
          <RadioGroup
            name='export'
            title='数据表导出内容'
            value={this.state.export}
            onChange={this._exportChange}
          >
            <Radio wrapperStyle={{width: 20, marginLeft: 10}} value='customer'>自定义</Radio>
            <Radio wrapperStyle={{width: 20, marginLeft: 10}} value='all'>全部</Radio>
          </RadioGroup>
        </div>
        <div style={{
          display: this.state.export === 'customer' ? 'flex' : 'none',
          alignItems: 'center',
          padding: 5,
        }}>
        <span style={{width: 140, textAlign: 'right'}}>
          自定义导出内容:
        </span>
          <div style={{display: 'flex', flexWrap: 'wrap'}}>
            <div style={{display: 'flex'}}>
              <Checkbox
                wrapperStyle={{width: 20, alignItems: 'center', marginLeft: 10}}
                onChange={e => this._typeChange(e, 'deleteTable')}
                value={this.state.type.deleteTable || false}
              />
              <span>删表语句</span>
            </div>
            <div style={{display: 'flex'}}>
              <Checkbox
                wrapperStyle={{width: 20, alignItems: 'center', marginLeft: 10}}
                onChange={e => this._typeChange(e, 'createTable')}
                value={this.state.type.createTable || false}
              />
              <span>建表语句</span>
            </div>
            <div style={{display: 'flex'}}>
              <Checkbox
                wrapperStyle={{width: 20, alignItems: 'center', marginLeft: 10}}
                onChange={e => this._typeChange(e, 'createIndex')}
                value={this.state.type.createIndex || false}
              />
              <span>建索引语句</span>
            </div>
            <div style={{display: 'flex'}}>
              <Checkbox
                wrapperStyle={{width: 20, alignItems: 'center', marginLeft: 10}}
                onChange={e => this._typeChange(e, 'updateComment')}
                value={this.state.type.updateComment || false}
              />
              <span>表注释语句</span>
            </div>
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            marginTop: '10px',
          }}
        >
          <Button
            onClick={this._preview}
          >预览</Button>
        </div>
      </div>
      <div style={{border: 'solid 1px #DFDFDF'}}>
        <div style={{margin: '10px 0px'}}>
          <Button type="primary" onClick={this._export}>导出</Button>
          <Button style={{marginLeft: 10}} onClick={this._export}>执行</Button>
        </div>
        <Editor
          height='300px'
          width='400px'
          mode={this._getMode(defaultDb)}
          value={data}
          onChange={this._valueChange}
          firstLine
        />
      </div>
    </div>);
  }
}
