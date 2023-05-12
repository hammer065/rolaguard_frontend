import * as React from "react";
import { observer, inject } from "mobx-react";
import {
  Table,
  Loader,
  Segment,
  Grid,
  Label,
  Icon,
  Divider,
  Pagination,
  Popup,
  Dropdown,
  Button,
  Menu,
} from "semantic-ui-react";
import "./quarantine.component.css";
import AlertUtil from "../util/alert-util";
import "./quarantine.component.css";
import Pie from "./visualizations/Pie";
import ImportanceLabel from "./utils/importance-label.component.js";

import Moment from "react-moment";

import "./dashboard.component.css";
import LoaderComponent from "./utils/loader.component";
import EmptyComponent from "./utils/empty.component";
import ColorUtil from "../util/colors";

// import QuarantineRemoveModal from "./quarantine.remove.modal";
import DetailsAlertModal from "./details.alert.modal.component";
import DeviceIdComponent from "./utils/device-id.component";
import AssetLink from "./utils/asset-link.component";
import TruncateMarkup from "react-truncate-markup";
@inject("deviceStore", "globalConfigStore")
@observer
class QuarantineComponent extends React.Component {
  colorsMap;
  ALERT_TYPE_NAME = "alert_type_name";
  ALERT_TYPE_RISK = "alert_type_risk";
  DATA_COLLECTOR_NAME = "data_collector_name";

  constructor(props) {
    super(props);

    this.colorsMap = AlertUtil.getColorsMap();

    this.state = {
      isLoadingTable: false,
      isLoadingByReasonViz: false,
      isLoadingByRiskViz: false,
      isLoadingByCollectorViz: false,
      byReasonsViz: [],
      byRiskViz: [],
      byCollectorViz: [],
      activePage: 1,
      pageSize: 50,
      criteria: {
        type: [],
        risk: [],
        dataCollector: [],
      },
      showFilters: false,
      selectedAlert: null,
      orderBy: ["last_checked", "DESC"],
    };

    this.getColorByPriority = this.getColorByPriority.bind(this);
  }

  loadQuarantineData(page) {
    this.setState({ isLoadingTable: true });

    const { orderBy, pageSize, criteria, selectedAlert } = this.state;

    const quarantinePromise = this.props.deviceStore.getQuarantine(
      { page: page, size: pageSize },
      criteria,
      orderBy
    );
    const quarantineDeviceCountPromise =
      this.props.deviceStore.getQuarantineDeviceCount(criteria);
    const quarantineCountPromise =
      this.props.deviceStore.getQuarantineCount(criteria);

    Promise.all([
      quarantinePromise,
      quarantineDeviceCountPromise,
      quarantineCountPromise,
    ])
      .then((data) => {
        this.setState({ isLoadingTable: false });

        if (selectedAlert) {
          if (selectedAlert.index === 0) {
            this.showAlertDetails(this.props.deviceStore.quarantine.length - 1);
          } else if (selectedAlert.index < pageSize) {
            this.showAlertDetails(0);
          }
        }
      })
      .catch((err) => {
        this.setState({ isLoadingTable: false, hasError: true });
        console.error("err", err);
      });
  }

  handlePageSizeChange = (e, data) => {
    this.setState({ pageSize: data.value }, this.componentDidMount);
  };

  componentDidMount() {
    this.loadViz();
    this.loadQuarantineData(1);
  }

  loadViz() {
    this.setState({ showFilters: false });

    this.setState({ isLoadingByReasonViz: true });
    const quarantineCountByAlertPromise =
      this.props.deviceStore.getQuarantineCount({
        groupBy: this.ALERT_TYPE_NAME,
      });
    quarantineCountByAlertPromise.then((data) => {
      const totalItems = data.reduce((total, item) => total + item.count, 0);

      const dataMap = this.rollUp(data, this.ALERT_TYPE_NAME, "alert_type_id");
      const dataArray = this.setPieArrayFromMap(
        dataMap,
        totalItems,
        this.getColorByIndex,
        (key) => this.state.criteria.type.includes(key)
      );

      this.setState({ isLoadingByReasonViz: false, byReasonsViz: dataArray });
    });

    this.setState({ isLoadingByRiskViz: true });
    const quarantineCountByRiskPromise =
      this.props.deviceStore.getQuarantineCount({
        groupBy: this.ALERT_TYPE_RISK,
      });
    quarantineCountByRiskPromise.then((data) => {
      const totalItems = data.reduce((total, item) => total + item.count, 0);

      const dataMap = this.rollUp(
        data,
        this.ALERT_TYPE_RISK,
        this.ALERT_TYPE_RISK
      );
      const dataArray = this.setPieArrayFromMap(
        dataMap,
        totalItems,
        this.getColorByPriority,
        (key) => this.state.criteria.risk.includes(key)
      );

      this.setState({ isLoadingByRiskViz: false, byRiskViz: dataArray });
    });

    this.setState({ isLoadingByCollectorViz: true });
    const quarantineCountByCollectorPromise =
      this.props.deviceStore.getQuarantineCount({
        groupBy: this.DATA_COLLECTOR_NAME,
      });
    quarantineCountByCollectorPromise.then((data) => {
      const totalItems = data.reduce((total, item) => total + item.count, 0);

      const dataMap = this.rollUp(
        data,
        this.DATA_COLLECTOR_NAME,
        "data_collector_id"
      );
      const dataArray = this.setPieArrayFromMap(
        dataMap,
        totalItems,
        this.getColorByIndex,
        (key) => this.state.criteria.dataCollector.includes(key)
      );

      this.setState({
        isLoadingByCollectorViz: false,
        byCollectorViz: dataArray,
      });
    });

    Promise.all([
      quarantineCountByAlertPromise,
      quarantineCountByRiskPromise,
      quarantineCountByCollectorPromise,
    ])
      .then((data) => {
        this.setState({ showFilters: this.showFilters() });
      })
      .catch((err) => {
        this.setState({ isLoading: false, hasError: true });
        console.error("err", err);
      });
  }

  getColorByPriority(item, key, index) {
    return this.colorsMap[key.toUpperCase()];
  }

  getColorByIndex(item, key, index) {
    return ColorUtil.getByIndex(index);
  }

  setPieArrayFromMap(map, totalItems, colorFn, selectedFn) {
    let index = 0;
    let array = [];

    map.forEach((value, key) => {
      array.push({
        label: key,
        percentage: value.total / totalItems,
        value: value.total,
        color: colorFn(value, key, index++),
        id: value.id,
        selected: selectedFn(value.id),
      });
    });

    return array;
  }

  rollUp(data, key, id) {
    const map = new Map();

    data.forEach((item) => {
      let mapValue = { total: item.count, id: item[id] };
      map.set(item[key], mapValue);
    });

    return map;
  }

  clearFilters() {
    const { criteria } = this.state;

    this.state.byRiskViz.forEach((entry) => (entry.selected = false));
    this.state.byReasonsViz.forEach((entry) => (entry.selected = false));
    this.state.byCollectorViz.forEach((entry) => (entry.selected = false));

    criteria.type = [];
    criteria.risk = [];
    criteria.dataCollector = [];

    this.setState({ criteria, showFilters: false });

    this.loadQuarantineData(1);
  }

  showFilters() {
    const { byRiskViz, byReasonsViz, byCollectorViz } = this.state;

    return (
      byRiskViz.some((entry) => entry.selected) ||
      byReasonsViz.some((entry) => entry.selected) ||
      byCollectorViz.some((entry) => entry.selected)
    );
  }

  handlePaginationChange = (e, { activePage }) => {
    this.setState({ activePage });
    this.loadQuarantineData(activePage);
  };

  handleItemSelected = (array, selectedItem, type) => {
    const foundItem = array.find((item) => item.label === selectedItem.label);
    foundItem.selected = !foundItem.selected;

    const { criteria } = this.state;

    switch (type) {
      case this.ALERT_TYPE_NAME:
        criteria.type = array
          .filter((item) => item.selected)
          .map((item) => item.id);
        break;

      case this.ALERT_TYPE_RISK:
        criteria.risk = array
          .filter((risk) => risk.selected)
          .map((risk) => risk.label);
        break;

      case this.DATA_COLLECTOR_NAME:
        criteria.dataCollector = array
          .filter((dc) => dc.selected)
          .map((dc) => dc.id);
        break;
      default:
        break;
    }

    this.setState({
      [type]: array,
      activePage: 1,
      isLoadingTable: true,
      criteria,
      showFilters: this.showFilters(),
    });

    this.loadQuarantineData(1);
  };

  /*handleQuarantineRemoval = () => {
    this.setState({ activePage: 1 } );
    this.loadViz();
    this.loadQuarantineData(1)  
  }*/

  showAlertDetails = (index) => {
    const quarantine = this.props.deviceStore.quarantine[index];

    const selectedAlert = {
      index,
      alert: quarantine.alert,
      alert_type: quarantine.alert_type,
      isFirst: this.state.activePage === 1 && index === 0,
      isLast:
        this.state.activePage ===
          Math.ceil(
            this.props.deviceStore.quarantineCount / this.state.pageSize
          ) && index === this.props.deviceStore.quarantine.length - 1,
    };

    this.setState({ selectedAlert });
  };

  goToQuarantine = (direction) => {
    if (this.state.selectedAlert.index === 0 && direction < 0) {
      if (this.state.activePage > 1) {
        this.handlePaginationChange(null, {
          activePage: this.state.activePage - 1,
        });
      }

      return;
    }

    if (
      this.state.selectedAlert.index ===
        this.props.deviceStore.quarantine.length - 1 &&
      direction > 0
    ) {
      if (
        this.state.activePage <
        Math.ceil(this.props.deviceStore.quarantineCount / this.state.pageSize)
      ) {
        this.handlePaginationChange(null, {
          activePage: this.state.activePage + 1,
        });
      }

      return;
    }

    const newIndex = this.state.selectedAlert.index + direction;
    this.showAlertDetails(newIndex);
  };

  closeAlertDetails = () => {
    this.setState({ selectedAlert: null });
  };

  handleSort = (field) => {
    const { activePage, orderBy, criteria, pageSize } = this.state;
    if (orderBy[0] === field) {
      orderBy[1] = orderBy[1] === "ASC" ? "DESC" : "ASC";
    }
    orderBy[0] = field;
    this.setState({ activePage: 1, isLoading: true, orderBy });
    const quarantinePromise = this.props.deviceStore.getQuarantine(
      { page: activePage, size: pageSize },
      criteria,
      orderBy
    );
  };

  render() {
    const { quarantineDeviceCount, quarantineCount, quarantine } =
      this.props.deviceStore;

    const {
      orderBy,
      isLoadingByReasonViz,
      isLoadingByRiskViz,
      isLoadingByCollectorViz,
      activePage,
      pageSize,
      showFilters,
      selectedAlert,
    } = this.state;

    const pageSizeOptions = [
      { key: 1, text: "Show 10", value: 10 },
      { key: 2, text: "Show 25", value: 25 },
      { key: 3, text: "Show 50", value: 50 },
      { key: 4, text: "Show 100", value: 100 },
    ];

    let totalPages = Math.ceil(quarantineCount / pageSize);

    return (
      <div className="app-body-container-view">
        <div className="animated fadeIn animation-view dashboard">
          <div className="view-header">
            {/* HEADER TITLE */}
            <h1>CURRENT ISSUES</h1>
          </div>

          {/* VIEW BODY */}
          <div className="view-body">
            {quarantineDeviceCount === null && (
              <LoaderComponent loadingMessage="Loading Current Issues..." />
            )}
            {quarantineDeviceCount === 0 && (
              <EmptyComponent emptyMessage="There are no issues" />
            )}
            {quarantineDeviceCount > 0 && (
              <React.Fragment>
                <Segment>
                  <Grid className="animated fadeIn">
                    <Grid.Row columns={16} className="data-container pl pr">
                      <Grid.Column
                        className="data-container-box pr0"
                        floated="left"
                        mobile={16}
                        tablet={8}
                        computer={4}
                      >
                        <div className="box-data">
                          <h5 className="visualization-title">BY RISK</h5>
                          <Loader active={isLoadingByRiskViz} />
                          <Pie
                            isLoading={this.state.isLoadingTable}
                            data={this.state.byRiskViz}
                            type={this.ALERT_TYPE_RISK}
                            handler={this.handleItemSelected}
                          />
                        </div>
                      </Grid.Column>

                      <Grid.Column
                        className="data-container-box pr0"
                        floated="left"
                        mobile={16}
                        tablet={8}
                        computer={4}
                      >
                        <div className="box-data">
                          <h5 className="visualization-title">
                            BY ALERT DESCRIPTION
                          </h5>
                          <Loader active={isLoadingByReasonViz} />
                          <Pie
                            isLoading={this.state.isLoadingTable}
                            data={this.state.byReasonsViz}
                            type={this.ALERT_TYPE_NAME}
                            handler={this.handleItemSelected}
                          />
                        </div>
                      </Grid.Column>

                      <Grid.Column
                        className="data-container-box pr0"
                        floated="left"
                        mobile={16}
                        tablet={8}
                        computer={4}
                      >
                        <div className="box-data">
                          <h5 className="visualization-title">
                            BY DATA SOURCE
                          </h5>
                          <Loader active={isLoadingByCollectorViz} />
                          <Pie
                            isLoading={this.state.isLoadingTable}
                            data={this.state.byCollectorViz}
                            type={this.DATA_COLLECTOR_NAME}
                            handler={this.handleItemSelected}
                          />
                        </div>
                      </Grid.Column>

                      <Grid.Column
                        className="data-container-box flex-center pr0"
                        floated="left"
                        mobile={16}
                        tablet={8}
                        computer={4}
                      >
                        <Segment basic textAlign="center">
                          <i className="fas fa-microchip fa-2x" />
                          <Divider horizontal></Divider>
                          <div className="">
                            <h3>DEVICES</h3>
                            <h2>
                              {this.props.deviceStore.quarantineDeviceCount}
                            </h2>
                          </div>
                        </Segment>
                      </Grid.Column>
                    </Grid.Row>
                  </Grid>
                </Segment>
                <Segment>
                  <div className="sort-by">
                    <label className="sort-and-filters-labels">Sort by: </label>
                    <Button.Group size="tiny" className="sort-buttons">
                      <Button
                        color={orderBy[0] === "last_checked" ? "blue" : ""}
                        onClick={() => this.handleSort("last_checked")}
                      >
                        {orderBy[0] === "last_checked"
                          ? "Last Check (" + orderBy[1].toLowerCase() + ")"
                          : "Last Check"}
                      </Button>
                      <Button
                        color={orderBy[0] === "since" ? "blue" : ""}
                        onClick={() => this.handleSort("since")}
                      >
                        {orderBy[0] === "since"
                          ? "Date (" + orderBy[1].toLowerCase() + ")"
                          : "Date"}
                      </Button>
                      <Button
                        color={orderBy[0] === "device_id" ? "blue" : ""}
                        onClick={() => this.handleSort("device_id")}
                      >
                        {orderBy[0] === "device_id"
                          ? "Device ID (" + orderBy[1].toLowerCase() + ")"
                          : "Device ID"}
                      </Button>
                      <Button
                        icon="remove"
                        onClick={() => this.handleSort("")}
                      ></Button>
                    </Button.Group>
                  </div>
                  {showFilters && (
                    <div>
                      <label style={{ fontWeight: "bolder" }}>Filters: </label>
                      {this.state.byRiskViz
                        .filter((risk) => risk.selected)
                        .map((risk, index) => (
                          <Label
                            as="a"
                            key={this.ALERT_TYPE_RISK + index}
                            className="text-uppercase"
                            onClick={() => {
                              this.handleItemSelected(
                                this.state.byRiskViz,
                                risk,
                                this.ALERT_TYPE_RISK
                              );
                            }}
                          >
                            {risk.label}
                            <Icon name="delete" />
                          </Label>
                        ))}
                      {this.state.byReasonsViz
                        .filter((reason) => reason.selected)
                        .map((reason, index) => (
                          <Label
                            as="a"
                            key={this.ALERT_TYPE_NAME + index}
                            className="text-uppercase"
                            onClick={() => {
                              this.handleItemSelected(
                                this.state.byReasonsViz,
                                reason,
                                this.ALERT_TYPE_NAME
                              );
                            }}
                          >
                            {reason.label}
                            <Icon name="delete" />
                          </Label>
                        ))}
                      {this.state.byCollectorViz
                        .filter((collector) => collector.selected)
                        .map((collector, index) => (
                          <Label
                            as="a"
                            key={this.DATA_COLLECTOR_NAME + index}
                            className="text-uppercase"
                            onClick={() => {
                              this.handleItemSelected(
                                this.state.byCollectorViz,
                                collector,
                                this.DATA_COLLECTOR_NAME
                              );
                            }}
                          >
                            {collector.label}
                            <Icon name="delete" />
                          </Label>
                        ))}
                      <span
                        className="range-select"
                        onClick={() => this.clearFilters()}
                      >
                        Clear
                      </span>
                    </div>
                  )}
                  {quarantineCount === 0 && (
                    <Grid className="segment centered">
                      <EmptyComponent emptyMessage="No items found" />
                    </Grid>
                  )}
                  {quarantineCount > 0 && (
                    <Table
                      striped
                      selectable
                      className="animated fadeIn"
                      basic="very"
                      compact="very"
                    >
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell collapsing>RISK</Table.HeaderCell>
                          <Table.HeaderCell>DESCRIPTION</Table.HeaderCell>
                          <Table.HeaderCell
                            collapsing
                            className="hide-old-computer"
                          >
                            DATE
                          </Table.HeaderCell>
                          <Table.HeaderCell collapsing>
                            LAST CHECK
                          </Table.HeaderCell>
                          <Table.HeaderCell collapsing>
                            DevEUI/ADDRESS
                          </Table.HeaderCell>
                          <Table.HeaderCell>DEVICE NAME</Table.HeaderCell>
                          <Table.HeaderCell collapsing>
                            <Popup
                              trigger={
                                <span style={{ cursor: "pointer" }}>
                                  IMPORTANCE
                                </span>
                              }
                            >
                              The importance value indicates the user-defined
                              relevance of the device into the organization. Can
                              be set for each device in the Inventory section.
                            </Popup>
                          </Table.HeaderCell>
                          <Table.HeaderCell>GATEWAY</Table.HeaderCell>
                          <Table.HeaderCell className="hide-old-computer">
                            DATA SOURCE
                          </Table.HeaderCell>
                          {/*<Table.HeaderCell collapsing>
                            ACTIONS
                          </Table.HeaderCell>
                          */}
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {!this.state.isLoadingTable &&
                          quarantine.map((item, index) => {
                            return (
                              <Table.Row
                                key={index}
                                style={{ cursor: "pointer" }}
                              >
                                <Table.Cell
                                  onClick={() => this.showAlertDetails(index)}
                                >
                                  <Label
                                    horizontal
                                    style={{
                                      backgroundColor:
                                        AlertUtil.getColorsMap()[
                                          item.alert_type.risk
                                        ],
                                      color: "white",
                                      borderWidth: 1,
                                      width: "100px",
                                    }}
                                  >
                                    {item.alert_type.risk}
                                  </Label>
                                </Table.Cell>
                                <Table.Cell
                                  onClick={() => this.showAlertDetails(index)}
                                >
                                  {item.alert_type.name}
                                </Table.Cell>
                                <Table.Cell
                                  singleLine
                                  onClick={() => this.showAlertDetails(index)}
                                  className="hide-old-computer"
                                >
                                  {
                                    <Moment
                                      format={
                                        this.props.globalConfigStore.dateFormats
                                          .moment.dateTimeFormat
                                      }
                                    >
                                      {item.since}
                                    </Moment>
                                  }
                                </Table.Cell>

                                <Table.Cell
                                  singleLine
                                  onClick={() => this.showAlertDetails(index)}
                                >
                                  {
                                    <Moment
                                      format={
                                        this.props.globalConfigStore.dateFormats
                                          .moment.dateTimeFormat
                                      }
                                    >
                                      {item.last_checked}
                                    </Moment>
                                  }
                                </Table.Cell>
                                <Table.Cell
                                  className="id-cell upper"
                                  onClick={() => this.showAlertDetails(index)}
                                >
                                  <DeviceIdComponent
                                    parameters={item.alert.parameters}
                                    alertType={item.alert.type}
                                    deviceId={item.alert.device_id}
                                  />
                                </Table.Cell>
                                <Table.Cell
                                  onClick={() => this.showAlertDetails(index)}
                                >
                                  {item.alert.parameters.dev_name}
                                </Table.Cell>

                                <Table.Cell
                                  onClick={() => this.showAlertDetails(index)}
                                >
                                  {" "}
                                  <ImportanceLabel
                                    importance={item.alert.asset_importance}
                                  />{" "}
                                </Table.Cell>
                                <Table.Cell
                                  className="upper"
                                  style={{ maxWidth: "180px" }}
                                >
                                  <TruncateMarkup>
                                    <div>
                                      <TruncateMarkup.Atom key={item.alert.id}>
                                        <AssetLink
                                          title={
                                            item.alert.parameters.gateway +
                                            (item.alert.parameters.gw_name
                                              ? ` (${item.alert.parameters.gw_name})`
                                              : "")
                                          }
                                          id={item.alert.gateway_id}
                                          type="gateway"
                                        />
                                      </TruncateMarkup.Atom>
                                    </div>
                                  </TruncateMarkup>
                                </Table.Cell>
                                <Table.Cell
                                  className="hide-old-computer"
                                  onClick={() => this.showAlertDetails(index)}
                                >
                                  {item.data_collector_name}
                                </Table.Cell>
                                {/*<Table.Cell>
                                  <div className="td-actions">
                                    <QuarantineRemoveModal
                                      item={item}
                                      handleQuarantineRemoval={
                                        this.handleQuarantineRemoval
                                      }
                                    ></QuarantineRemoveModal>
                                  </div>
                                </Table.Cell>*/}
                              </Table.Row>
                            );
                          })}
                      </Table.Body>
                    </Table>
                  )}
                  {this.state.isLoadingTable && (
                    <LoaderComponent
                      loadingMessage="Loading current issues ..."
                      style={{ marginBottom: 20 }}
                    />
                  )}
                  {!this.state.isLoadingTable && (
                    <Grid className="segment centered">
                      <Pagination
                        className=""
                        activePage={activePage}
                        onPageChange={this.handlePaginationChange}
                        totalPages={totalPages}
                      />
                      <Menu compact>
                        <Dropdown
                          className=""
                          text={"Show " + pageSize}
                          options={pageSizeOptions}
                          onChange={this.handlePageSizeChange}
                          item
                        />
                      </Menu>
                    </Grid>
                  )}
                </Segment>
                {selectedAlert && (
                  <DetailsAlertModal
                    loading={this.state.isLoadingTable}
                    alert={selectedAlert}
                    onClose={this.closeAlertDetails}
                    onNavigate={this.goToQuarantine}
                  />
                )}
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default QuarantineComponent;
